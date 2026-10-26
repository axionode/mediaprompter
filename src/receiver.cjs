'use strict';
const { EventEmitter } = require('node:events');
const { spawn } = require('node:child_process');
const { createServer } = require('node:http');
const { createConnection, createServer: createTcpServer } = require('node:net');
const { randomBytes, randomInt } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { videoProfile, jpegDimensions, PROFILES } = require('./video-quality.cjs');
function unusedPort() {
  return new Promise((resolve, reject) => {
    const server = createTcpServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)); });
  });
}
class Receiver extends EventEmitter {
  constructor(root, options = {}) {
    super(); this.root = root; this.options = { name: options.name || 'Mediaprompter', quality: PROFILES[options.quality] ? options.quality : 'detail' }; this.clients = new Set(); this.children = new Set();
    this.status = { state: 'off', name: this.options.name, quality: this.options.quality, pin: '', message: '', frames: 0, width: 0, height: 0, fps: 0, decoder: 'FFmpeg H.264' };
    this.logs = []; this.buffer = Buffer.alloc(0); this.stopped = true;
  }
  setQuality(value) {
    if (!PROFILES[value]) return this.status;
    this.options.quality = value;
    this.update({ quality: value, needsReconnect: !this.stopped });
    return this.status;
  }
  update(patch) { this.status = { ...this.status, ...patch }; this.emit('status', this.status); }
  log(value) {
    const line = String(value).trim().slice(0, 1800);
    if (!line) return;
    this.logs.push(line); if (this.logs.length > 50) this.logs.shift();
    if (/error|failed|could not/i.test(line)) this.emit('diagnostic', line);
  }
  async start() {
    if (!this.stopped) return this.status;
    const nativeRoot = path.join(this.root, 'runtime', 'receiver');
    const exe = path.join(nativeRoot, 'uxplay.exe');
    if (!fs.existsSync(exe)) {
      this.update({ state: 'error', message: 'Компонент AirPlay ещё не собран. См. README.' });
      return this.status;
    }
    this.stopped = false; this.buffer = Buffer.alloc(0); this.latestFrame = null; this.logs = []; this.metricsStart = 0; this.metricsFrames = 0;
    this.token = randomBytes(24).toString('hex');
    this.pin = String(randomInt(1000, 10000)); this.port = await unusedPort();
    this.update({ state: 'starting', pin: this.pin, message: 'Запускаем приёмник…', frames: 0, width: 0, height: 0, fps: 0, needsReconnect: false });
    this.http = createServer((req, res) => {
      if (req.method !== 'GET' || req.url !== '/' + this.token + '/video') { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'Content-Type': 'multipart/x-mixed-replace; boundary=mpframe', 'Cache-Control': 'no-store, no-cache', 'X-Content-Type-Options': 'nosniff', 'Connection': 'keep-alive' });
      res.flushHeaders(); this.clients.add(res);
      req.on('close', () => this.clients.delete(res));
      if (this.latestFrame) this.writeFrame(res, this.latestFrame);
    });
    await new Promise((resolve, reject) => { this.http.once('error', reject); this.http.listen(0, '127.0.0.1', resolve); });
    const streamUrl = 'http://127.0.0.1:' + this.http.address().port + '/' + this.token + '/video';
    const profile = videoProfile(this.options.quality);
    const pipeline = 'videoconvert ! video/x-raw,format=Y444 ! jpegenc quality=98 ! multipartmux boundary=nativeframe ! tcpserversink host=127.0.0.1 port=' + this.port + ' sync=false';
    const args = ['-n', this.options.name, '-nh', '-pw', this.pin, '-as', '0', '-fps', String(profile.fps), '-vsync', 'no', '-vd', 'avdec_h264 max-threads=2 output-corrupt=false discard-corrupted-frames=true', '-s', profile.width + 'x' + profile.height + '@' + profile.fps, '-vs', pipeline, '-nofreeze'];
    const env = { ...process.env, PATH: nativeRoot + path.delimiter + process.env.PATH,
      GST_PLUGIN_PATH: path.join(nativeRoot, 'lib', 'gstreamer-1.0'),
      GST_PLUGIN_SYSTEM_PATH: path.join(nativeRoot, 'lib', 'gstreamer-1.0'),
      GST_PLUGIN_SCANNER: path.join(nativeRoot, 'libexec', 'gstreamer-1.0', 'gst-plugin-scanner.exe'),
      GST_REGISTRY: path.join(this.root, 'work', 'gstreamer-registry-v2.bin'),
      GST_DEBUG_NO_COLOR: '1', UXPLAYRC: path.join(nativeRoot, 'receiver.conf') };
    const child = this.child = spawn(exe, args, { cwd: nativeRoot, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    this.children.add(this.child);
    this.child.stdout.on('data', b => this.log(b.toString()));
    this.child.stderr.on('data', b => this.log(b.toString()));
    this.child.once('error', e => { this.update({ state: 'error', message: 'Не удалось запустить AirPlay: ' + e.message }); this.stop(false); });
    this.child.once('exit', code => {
      this.children.delete(child);
      if (!this.stopped && this.child === child) {
        this.update({ state: 'error', message: 'Приёмник завершился (' + code + '). ' + this.logs.slice(-2).join(' ').slice(0, 200) });
        this.stop(false);
      }
    });
    this.update({ streamUrl });
    this.connectStream();
    this.readyTimer = setTimeout(() => {
      if (!this.stopped && this.status.state === 'starting') this.update({ state: 'ready', message: 'На iPhone: Пункт управления → Повтор экрана → Mediaprompter' });
    }, 2500);
    this.watchdog = setInterval(() => {
      if (!this.stopped && this.status.state === 'connected' && Date.now() - this.lastFrameTime > 6000) {
        this.update({ state: 'ready', message: 'Кадры не поступают. Проверьте «Повтор экрана» на iPhone.' });
      }
    }, 1000);
    return this.status;
  }
  connectStream() {
    if (this.stopped) return;
    const socket = createConnection({ host: '127.0.0.1', port: this.port });
    this.socket = socket;
    socket.on('data', data => { if (socket === this.socket) this.acceptData(data); });
    socket.on('error', () => {});
    socket.once('close', () => {
      this.buffer = Buffer.alloc(0);
      if (!this.stopped && this.socket === socket) this.retryTimer = setTimeout(() => this.connectStream(), 650);
    });
  }
  acceptData(data) {
    this.buffer = Buffer.concat([this.buffer, data]);
    if (this.buffer.length > 16 * 1024 * 1024) { this.buffer = Buffer.alloc(0); return; }
    while (true) {
      const start = this.buffer.indexOf(Buffer.from([255, 216]));
      if (start < 0) { if (this.buffer.length > 65536) this.buffer = this.buffer.subarray(-1); break; }
      const end = this.buffer.indexOf(Buffer.from([255, 217]), start + 2);
      if (end < 0) { if (start) this.buffer = this.buffer.subarray(start); break; }
      const frame = this.buffer.subarray(start, end + 2);
      this.latestFrame = frame;
      this.lastFrameTime = Date.now();
      this.status.frames++;
      const dimensions = jpegDimensions(frame);
      const geometryChanged = dimensions && (dimensions.width !== this.status.width || dimensions.height !== this.status.height);
      if (dimensions) Object.assign(this.status, dimensions);
      const now = Date.now();
      if (!this.metricsStart || this.status.state !== 'connected') { this.metricsStart = now; this.metricsFrames = 0; }
      this.metricsFrames++;
      const elapsed = now - this.metricsStart;
      if (this.status.state !== 'connected') this.update({ state: 'connected', message: 'Изображение с iPhone' });
      else if (geometryChanged || elapsed >= 1000) {
        const fps = elapsed >= 1000 ? Math.round(this.metricsFrames * 1000 / elapsed) : this.status.fps;
        this.update({ fps });
        if (elapsed >= 1000) { this.metricsStart = now; this.metricsFrames = 0; }
      }
      for (const client of this.clients) if (client.writableLength < 2 * 1024 * 1024) this.writeFrame(client, frame);
      this.buffer = this.buffer.subarray(end + 2);
    }
  }
  writeFrame(res, frame) {
    if (res.destroyed) return;
    res.write('--mpframe\r\nContent-Type: image/jpeg\r\nContent-Length: ' + frame.length + '\r\n\r\n');
    res.write(frame); res.write('\r\n');
  }
  stop(reset = true) {
    this.stopped = true;
    clearTimeout(this.readyTimer); clearTimeout(this.retryTimer); clearInterval(this.watchdog);
    if (this.socket) this.socket.destroy(); this.socket = null;
    for (const child of this.children) { try { child.kill(); } catch {} }
    this.children.clear();
    for (const client of this.clients) client.end();
    this.clients.clear(); if (this.http) this.http.close();
    this.latestFrame = null; this.buffer = Buffer.alloc(0);
    if (reset) this.update({ state: 'off', streamUrl: '', pin: '', message: '', frames: 0, width: 0, height: 0, fps: 0 });
    return this.status;
  }
}
module.exports = { Receiver };
