'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { constrainRect, resizeRect, fitVideo, scrollStep, normalizeText } = require('../src/core.cjs');
test('a resized desktop always keeps panels reachable', () => {
  assert.deepEqual(constrainRect({ x: 1100, y: 700, w: 700, h: 500 }, { w: 800, h: 400 }), { x: 100, y: 0, w: 700, h: 400 });
  assert.deepEqual(constrainRect({ x: 20, y: 20, w: 160, h: 96 }, { w: 90, h: 60 }), { x: 0, y: 0, w: 90, h: 60 });
});
test('dragging a left resize handle cannot flip or lose a panel', () => {
  const result = resizeRect({ x: 100, y: 100, w: 300, h: 200 }, 'nw', 600, -300, { w: 800, h: 600 });
  assert.deepEqual(result, { x: 240, y: 0, w: 160, h: 300 });
});
test('90 degree video fits by its rotated bounds without stretching', () => {
  const size = fitVideo(1920, 1080, 300, 400, 90);
  assert.equal(size.width, 400);
  assert.equal(size.height, 225);
  assert.equal(size.width / size.height, 1920 / 1080);
});
test('a long suspension never jumps the prompter several paragraphs', () => {
  assert.equal(scrollStep(100, 50, 10, 1000), 105);
  assert.equal(scrollStep(995, 50, 0.1, 1000), 1000);
});
test('plain text normalization preserves paragraphs and removes NUL', () => {
  assert.equal(normalizeText('a\r\nb\rc\u0000'), 'a\nb\nc');
});
