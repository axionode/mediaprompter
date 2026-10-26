'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { jpegDimensions, videoProfile } = require('../src/video-quality.cjs');
test('JPEG resolution reflects received frame, including portrait orientation', () => {
 const jpeg = Buffer.from('ffd8ffe000040000ffc00011080780043803011100021101031101ffd9','hex');
 assert.deepEqual(jpegDimensions(jpeg), { width:1080,height:1920 });
});
test('truncated and invalid JPEG headers do not manufacture resolution', () => {
 assert.equal(jpegDimensions(Buffer.from([255,216,255,192,255,255])),null);
 assert.equal(jpegDimensions(Buffer.from([255,216,255,192,0,0])),null);
 assert.equal(jpegDimensions(Buffer.alloc(3)),null);
 assert.equal(jpegDimensions(Buffer.from('not a frame')),null);
});
test('unknown quality cannot enable an unbounded stream size', () => {
 assert.equal(videoProfile('anything').width,1920);
 assert.equal(videoProfile('stable').width,1280);
});
