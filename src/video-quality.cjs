'use strict';
const PROFILES = Object.freeze({
  detail: Object.freeze({ label: 'Высокая детализация', width: 1920, height: 1080, fps: 30 }),
  stable: Object.freeze({ label: 'Стабильная передача', width: 1280, height: 720, fps: 30 })
});
function videoProfile(id) { return PROFILES[id] || PROFILES.detail; }
function jpegDimensions(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4 || buffer[0] !== 255 || buffer[1] !== 216) return null;
  let offset = 2;
  while (offset + 3 < buffer.length) {
    if (buffer[offset++] !== 255) return null;
    while (offset < buffer.length && buffer[offset] === 255) offset++;
    const marker = buffer[offset++];
    if (marker === 217 || marker === 218) return null;
    if (marker === 1 || marker >= 208 && marker <= 215) continue;
    if (offset + 2 > buffer.length) return null;
    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) return null;
    if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)) {
      if (length < 8) return null;
      const height = buffer.readUInt16BE(offset + 3), width = buffer.readUInt16BE(offset + 5);
      return width && height ? { width, height } : null;
    }
    offset += length;
  }
  return null;
}
module.exports = { PROFILES, videoProfile, jpegDimensions };
