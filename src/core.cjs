'use strict';
const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));
function constrainRect(rect, bounds, min = { w: 160, h: 96 }) {
  const w = clamp(Number(rect.w) || min.w, Math.min(min.w, bounds.w), bounds.w);
  const h = clamp(Number(rect.h) || min.h, Math.min(min.h, bounds.h), bounds.h);
  return { x: clamp(Number(rect.x) || 0, 0, bounds.w - w), y: clamp(Number(rect.y) || 0, 0, bounds.h - h), w, h };
}
function resizeRect(rect, edge, dx, dy, bounds, min = { w: 160, h: 96 }) {
  let left = rect.x, top = rect.y, right = rect.x + rect.w, bottom = rect.y + rect.h;
  if (edge.includes('w')) left = clamp(left + dx, 0, right - Math.min(min.w, right));
  if (edge.includes('e')) right = clamp(right + dx, left + Math.min(min.w, bounds.w - left), bounds.w);
  if (edge.includes('n')) top = clamp(top + dy, 0, bottom - Math.min(min.h, bottom));
  if (edge.includes('s')) bottom = clamp(bottom + dy, top + Math.min(min.h, bounds.h - top), bounds.h);
  return constrainRect({ x: left, y: top, w: right - left, h: bottom - top }, bounds, min);
}
function fitVideo(width, height, containerWidth, containerHeight, rotation, zoom = 1) {
  const quarter = ((rotation % 180) + 180) % 180 !== 0;
  const w = quarter ? height : width, h = quarter ? width : height;
  const scale = Math.min(containerWidth / w, containerHeight / h) * zoom;
  return { width: width * scale, height: height * scale };
}
function scrollStep(position, speed, elapsed, max) {
  return clamp(position + speed * clamp(elapsed, 0, 0.1), 0, max);
}
function normalizeText(text) { return String(text).replace(/\r\n?/g, '\n').replace(/\u0000/g, ''); }
const api = { clamp, constrainRect, resizeRect, fitVideo, scrollStep, normalizeText };
if (typeof module !== 'undefined') module.exports = api;
if (typeof window !== 'undefined') window.PrompterCore = api;
