'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { Receiver } = require('../src/receiver.cjs');
const root = path.resolve(__dirname, '..');
const delay = ms => new Promise(resolve => setTimeout(resolve,ms));
test('native receiver starts without a system Bonjour service and streams real JPEG frames locally', { timeout:45000 }, async () => {
  const receiver = new Receiver(root, { name: 'Mediaprompter test' });
  try {
    await receiver.start();
    await delay(4500);
    assert.equal(receiver.status.state,'ready',receiver.logs.join('\n'));
    assert.ok(receiver.child && receiver.child.exitCode === null);
    const stream = await fetch(receiver.status.streamUrl);
    assert.match(stream.headers.get('content-type'),/multipart/);
    const env = { ...process.env, PATH:path.join(root,'runtime/receiver')+path.delimiter+process.env.PATH,
      GST_PLUGIN_PATH:path.join(root,'runtime/receiver/lib/gstreamer-1.0'),
      GST_PLUGIN_SYSTEM_PATH:path.join(root,'runtime/receiver/lib/gstreamer-1.0'),
      GST_PLUGIN_SCANNER:path.join(root,'runtime/receiver/libexec/gstreamer-1.0/gst-plugin-scanner.exe'),
      GST_REGISTRY:path.join(root,'work/test-gstreamer-registry.bin') };
    const generator=spawn(path.join(root,'runtime/receiver/gst-launch-1.0.exe'),
      ['-q','videotestsrc','num-buffers=3','!','video/x-raw,format=I420,width=320,height=240','!','openh264enc','!','h264parse','!','avdec_h264','max-threads=2','output-corrupt=false','!','videoconvert','!','video/x-raw,format=Y444','!','jpegenc','quality=98','!','fdsink','fd=1'],
      {cwd:path.join(root,'runtime/receiver'),env,windowsHide:true,stdio:['ignore','pipe','pipe']});
    let errors='';
    generator.stderr.on('data',b=>errors+=b);
    generator.stdout.on('data',b=>receiver.acceptData(b));
    await new Promise((resolve,reject)=>{generator.once('error',reject);generator.once('exit',code=>code===0?resolve():reject(Error(errors)));});
    const reader=stream.body.getReader();
    const result=await reader.read();
    assert.ok(result.value.length>20);
    assert.equal(receiver.status.state,'connected');
    assert.ok(receiver.status.frames>=3);
    assert.equal(receiver.status.width,320);
    assert.equal(receiver.status.height,240);
    await reader.cancel();
    const denied=await fetch(receiver.status.streamUrl.replace(/\/[0-9a-f]+\//,'/wrong/'));
    assert.equal(denied.status,404);
  } finally { receiver.stop(); }
  assert.equal(receiver.status.state,'off');
  assert.equal(receiver.children.size,0);
});
