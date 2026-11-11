import * as THREE from 'three';
import { rng, fbm2 } from './util.js';
// Procedural canvas textures. Albedo is kept near-neutral where a per-building tint multiplies it.
export function canvasTex(w, h, draw, o = {}) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d');
  draw(c, w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = o.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = o.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping; t.anisotropy = +(new URLSearchParams(location.search).get('aniso') ?? 8); return t;
}
function mottle(c, w, h, seed, amp = 14, scale = 5, tint = [0, 0, 0]) {
  const im = c.getImageData(0, 0, w, h), d = im.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const n = (fbm2(x / w * scale, y / h * scale, 4, seed) - 0.5) * 2 * amp + (fbm2(x / w * scale * 9, y / h * scale * 9, 2, seed + 9) - 0.5) * amp * 0.7;
    const i = (y * w + x) * 4; d[i] += n + tint[0]; d[i + 1] += n + tint[1]; d[i + 2] += n + tint[2];
  }
  c.putImageData(im, 0, 0);
}
// one bay (3.2 m) x one floor (3.0 m). style 0: window, 1: shuttered window, 2: balcony door + iron rail, 3: modern apartment strip balcony, 4: blank party wall
export function facadeTex(style, seed) {
  const S = 512, M = S / 3.2, r = rng(seed);
  return canvasTex(S, S, (c) => {
    c.fillStyle = '#f1ede4'; c.fillRect(0, 0, S, S);
    // peeling / patched plaster
    for (let i = 0; i < 26; i++) {
      c.fillStyle = `rgba(${r() < 0.5 ? '120,105,90' : '255,252,244'},${0.05 + r() * 0.10})`;
      const x = r() * S, y = r() * S; c.beginPath();
      for (let k = 0; k < 9; k++) c.lineTo(x + Math.cos(k * 0.7) * (10 + r() * 46), y + Math.sin(k * 0.7) * (8 + r() * 30)); c.fill();
    }
    if (style === 4) { // blank wall: big stains, an old patch of exposed brick
      for (let i = 0; i < 9; i++) { const x = r() * S; const g = c.createLinearGradient(0, 0, 0, S); g.addColorStop(0, 'rgba(70,60,50,0.22)'); g.addColorStop(1, 'rgba(70,60,50,0)'); c.fillStyle = g; c.fillRect(x, 0, 6 + r() * 30, S * (0.4 + r() * 0.6)); }
      c.fillStyle = 'rgba(150,84,60,0.5)'; const bx = r() * 300, by = r() * 300; for (let j = 0; j < 7; j++) for (let i = 0; i < 6; i++) if (r() < 0.8) c.fillRect(bx + i * 22 + (j % 2) * 11, by + j * 10, 20, 8);
      mottle(c, S, S, seed, 12, 4); return;
    }
    const yFloor = S;                         // canvas y grows downward; floor line at bottom
    // floor cornice
    c.fillStyle = '#fbf8f0'; c.fillRect(0, 0, S, 10); c.fillStyle = 'rgba(40,30,20,0.28)'; c.fillRect(0, 10, S, 5);
    const ww = (style === 3 ? 1.9 : 1.12) * M, wh = (style >= 2 ? 2.15 : 1.72) * M;
    const wx = (S - ww) / 2, wy = yFloor - (style >= 2 ? 0.0 : 0.86) * M - wh;
    // surround
    c.fillStyle = '#f9f6ee'; c.fillRect(wx - 16, wy - 20, ww + 32, wh + 30);
    c.fillStyle = 'rgba(40,30,20,0.22)'; c.fillRect(wx - 16, wy + wh + 10, ww + 32, 5);
    // glass with sky reflection
    const g = c.createLinearGradient(wx, wy, wx + ww * 0.6, wy + wh); g.addColorStop(0, '#5d7388'); g.addColorStop(0.45, '#27333f'); g.addColorStop(1, '#141a20');
    c.fillStyle = g; c.fillRect(wx, wy, ww, wh);
    if (r() < 0.6) { c.fillStyle = 'rgba(236,228,206,0.55)'; c.fillRect(wx + 3, wy + 3, ww - 6, wh * (0.25 + r() * 0.5)); }    // net curtain
    // frame + mullions
    c.strokeStyle = style === 1 ? '#e9e6dc' : '#f4f1e8'; c.lineWidth = 7; c.strokeRect(wx, wy, ww, wh);
    c.lineWidth = 5; c.beginPath(); c.moveTo(wx + ww / 2, wy); c.lineTo(wx + ww / 2, wy + wh); c.moveTo(wx, wy + wh * 0.3); c.lineTo(wx + ww, wy + wh * 0.3); c.stroke();
    if (style === 3) { c.beginPath(); c.moveTo(wx + ww * 0.25, wy); c.lineTo(wx + ww * 0.25, wy + wh); c.moveTo(wx + ww * 0.75, wy); c.lineTo(wx + ww * 0.75, wy + wh); c.stroke(); }
    if (style === 1) { // louvred shutters
      const sc = r.pick(['#5d7a5e', '#6c7f86', '#7a6248', '#4f6d63']);
      for (const sx of [wx - ww * 0.5 - 6, wx + ww + 6]) {
        c.fillStyle = sc; c.fillRect(sx, wy - 2, ww * 0.5, wh + 4); c.fillStyle = 'rgba(0,0,0,0.22)';
        for (let y = wy + 4; y < wy + wh; y += 9) c.fillRect(sx + 4, y, ww * 0.5 - 8, 3);
        c.fillStyle = 'rgba(235,225,205,0.25)'; for (let i = 0; i < 6; i++) c.fillRect(sx + r() * ww * 0.4, wy + r() * wh, 6 + r() * 12, 4 + r() * 10);   // flaked paint
      }
    }
    if (style < 2) { // sill + drip stains
      c.fillStyle = '#fbf9f2'; c.fillRect(wx - 22, wy + wh + 2, ww + 44, 11);
      for (let i = 0; i < 7; i++) { const x = wx - 14 + r() * (ww + 28); const gg = c.createLinearGradient(0, wy + wh + 14, 0, wy + wh + 120); gg.addColorStop(0, 'rgba(60,50,40,0.30)'); gg.addColorStop(1, 'rgba(60,50,40,0)'); c.fillStyle = gg; c.fillRect(x, wy + wh + 14, 3 + r() * 7, 60 + r() * 60); }
    }
    if (style === 2) { // painted iron balcony
      const bx = wx - 60, bw = ww + 120, by = yFloor - 1.0 * M;
      c.fillStyle = 'rgba(30,25,20,0.35)'; c.fillRect(bx - 4, yFloor - 10, bw + 8, 10);
      c.fillStyle = '#d9d4c8'; c.fillRect(bx - 6, yFloor - 16, bw + 12, 9);
      c.strokeStyle = r.pick(['#2f4a3c', '#26303a', '#3b332c']); c.lineWidth = 3;
      for (let x = bx; x <= bx + bw; x += 13) { c.beginPath(); c.moveTo(x, by); c.lineTo(x, yFloor - 16); c.stroke(); }
      c.lineWidth = 6; c.beginPath(); c.moveTo(bx - 2, by); c.lineTo(bx + bw + 2, by); c.stroke();
      c.lineWidth = 2; for (let x = bx; x < bx + bw; x += 26) { c.beginPath(); c.arc(x + 13, by + 30, 11, 0, 7); c.stroke(); }
    }
    if (style === 3) { // solid parapet balcony strip, AC unit
      const by = yFloor - 0.98 * M;
      c.fillStyle = 'rgba(20,18,15,0.38)'; c.fillRect(0, by + 0.98 * M - 8, S, 8);
      c.fillStyle = '#f6f2e8'; c.fillRect(22, by, S - 44, 0.9 * M); c.fillStyle = 'rgba(40,30,20,0.16)'; c.fillRect(22, by + 0.9 * M - 14, S - 44, 14);
      c.fillStyle = '#e6e2d8'; c.fillRect(22, by - 7, S - 44, 8);
      if (r() < 0.6) { c.fillStyle = '#d5d5d0'; c.fillRect(wx + ww + 20, wy + 30, 70, 46); c.fillStyle = '#9a9a96'; c.beginPath(); c.arc(wx + ww + 55, wy + 53, 16, 0, 7); c.fill(); }
      for (let i = 0; i < 5; i++) { const x = 30 + r() * (S - 60); const gg = c.createLinearGradient(0, by + 4, 0, by + 100); gg.addColorStop(0, 'rgba(60,50,40,0.25)'); gg.addColorStop(1, 'rgba(60,50,40,0)'); c.fillStyle = gg; c.fillRect(x, by + 4, 4 + r() * 8, 100); }
    }
    mottle(c, S, S, seed, 9, 5);
  });
}
export const roofTex = (seed) => canvasTex(512, 512, (c, w, h) => {
  const r = rng(seed); c.fillStyle = '#7d3f2a'; c.fillRect(0, 0, w, h);
  const tw = 32, th = 40;
  for (let j = -1; j < h / th + 1; j++) for (let i = 0; i < w / tw; i++) {
    const v = r(); const col = v < 0.12 ? [118, 70, 50] : v > 0.9 ? [201, 120, 82] : [176 + r() * 22, 96 + r() * 20, 64 + r() * 16];
    c.fillStyle = `rgb(${col[0] | 0},${col[1] | 0},${col[2] | 0})`;
    const x = i * tw, y = j * th; c.beginPath(); c.moveTo(x + 2, y); c.lineTo(x + tw - 2, y); c.lineTo(x + tw - 2, y + th - 8); c.quadraticCurveTo(x + tw / 2, y + th + 4, x + 2, y + th - 8); c.fill();
    const g = c.createLinearGradient(x, 0, x + tw, 0); g.addColorStop(0, 'rgba(0,0,0,0.30)'); g.addColorStop(0.3, 'rgba(255,220,190,0.14)'); g.addColorStop(1, 'rgba(0,0,0,0.28)'); c.fillStyle = g; c.fillRect(x, y, tw, th);
    c.fillStyle = 'rgba(30,14,8,0.42)'; c.fillRect(x, y + th - 5, tw, 5);
  }
  for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(${r() < 0.5 ? '70,84,50' : '50,40,34'},${0.08 + r() * 0.16})`; c.beginPath(); c.arc(r() * w, r() * h, 6 + r() * 30, 0, 7); c.fill(); }
});
export const tileFloorTex = (seed) => canvasTex(512, 512, (c, w, h) => {
  const r = rng(seed); c.fillStyle = '#8f8a80'; c.fillRect(0, 0, w, h); const n = 8, s = w / n;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const v = 150 + r() * 28; c.fillStyle = `rgb(${v + 22 | 0},${v - 26 | 0},${v - 52 | 0})`; c.fillRect(i * s + 2, j * s + 2, s - 4, s - 4); }
  for (let i = 0; i < 30; i++) { c.fillStyle = `rgba(50,45,40,${0.05 + r() * 0.12})`; c.beginPath(); c.ellipse(r() * w, r() * h, 10 + r() * 60, 8 + r() * 30, r() * 3, 0, 7); c.fill(); }
  mottle(c, w, h, seed, 8, 6);
});
export const concreteTex = (seed) => canvasTex(512, 512, (c, w, h) => {
  const r = rng(seed); c.fillStyle = '#e9e5db'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 16; i++) { const x = r() * w; const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(60,52,44,0.30)'); g.addColorStop(1, 'rgba(60,52,44,0)'); c.fillStyle = g; c.fillRect(x, 0, 4 + r() * 22, h * (0.3 + r() * 0.7)); }
  mottle(c, w, h, seed, 14, 5);
});
export const cobbleTex = (seed) => canvasTex(512, 512, (c, w, h) => {
  const r = rng(seed); c.fillStyle = '#3d3a37'; c.fillRect(0, 0, w, h); const s = 32;
  for (let j = 0; j < h / s; j++) for (let i = -1; i < w / s; i++) { const v = 96 + r() * 50; c.fillStyle = `rgb(${v | 0},${v - 3 | 0},${v - 8 | 0})`; const x = i * s + (j % 2) * s / 2 + 2, y = j * s + 2; c.beginPath(); c.roundRect(x, y, s - 4, s - 4, 6); c.fill(); c.fillStyle = 'rgba(255,255,255,0.10)'; c.fillRect(x + 3, y + 3, s - 12, 4); }
  mottle(c, w, h, seed, 10, 4);
});
export const parquetTex = (seed) => canvasTex(1024, 1024, (c, w, h) => {
  const r = rng(seed); c.fillStyle = '#6b4526'; c.fillRect(0, 0, w, h); const pw = 64, pl = 256;
  for (let j = 0; j < h / pw; j++) for (let i = -1; i < w / pl + 1; i++) {
    const v = r(); const x = i * pl + (j % 4) * 64, y = j * pw; c.fillStyle = `rgb(${150 + v * 46 | 0},${98 + v * 34 | 0},${52 + v * 22 | 0})`; c.fillRect(x + 1, y + 1, pl - 2, pw - 2);
    c.strokeStyle = 'rgba(70,40,18,0.22)'; c.lineWidth = 1; for (let k = 0; k < 5; k++) { const yy = y + 6 + r() * (pw - 12); c.beginPath(); c.moveTo(x + 2, yy); c.bezierCurveTo(x + pl * 0.3, yy + r() * 8 - 4, x + pl * 0.6, yy + r() * 8 - 4, x + pl - 2, yy + r() * 6 - 3); c.stroke(); }
  }
  mottle(c, w, h, seed, 6, 6);
});
export const fabricTex = (seed) => canvasTex(256, 256, (c, w, h) => {
  c.fillStyle = '#d8d8d8'; c.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) { const a = ((x / 4 + y / 4) % 2) ? 0.05 : 0.0; c.fillStyle = `rgba(0,0,0,${a})`; c.fillRect(x, y, 4, 4); c.fillStyle = 'rgba(255,255,255,0.10)'; c.fillRect(x, y, 2, 1); }
  mottle(c, w, h, seed, 12, 24);
});
export const kilimTex = (seed) => canvasTex(512, 768, (c, w, h) => {
  const col = ['#8e2f25', '#1f2f4f', '#e3d3ae', '#c08a2e', '#4c5a3a', '#6e1f1f'];
  c.fillStyle = col[0]; c.fillRect(0, 0, w, h);
  c.fillStyle = col[1]; c.fillRect(22, 22, w - 44, h - 44); c.fillStyle = col[2]; c.fillRect(40, 40, w - 80, h - 80); c.fillStyle = col[0]; c.fillRect(52, 52, w - 104, h - 104);
  for (let k = 0; k < 3; k++) { const cy = 150 + k * 234; for (let i = 5; i >= 0; i--) { c.fillStyle = col[(i + k) % 5 + (i === 0 ? 0 : 0)]; const s = 26 + i * 26; c.beginPath(); c.moveTo(w / 2, cy - s * 0.72); c.lineTo(w / 2 + s, cy); c.lineTo(w / 2, cy + s * 0.72); c.lineTo(w / 2 - s, cy); c.fill(); } }
  c.fillStyle = col[3]; for (let y = 60; y < h - 60; y += 24) { for (const x of [64, w - 64]) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + 9, y + 12); c.lineTo(x, y + 24); c.lineTo(x - 9, y + 12); c.fill(); } }
  c.fillStyle = col[2]; for (let x = 28; x < w - 20; x += 16) { c.fillRect(x, 26, 8, 8); c.fillRect(x, h - 34, 8, 8); }
  for (let y = 0; y < h; y += 3) { c.fillStyle = `rgba(0,0,0,${0.03 + 0.05 * ((y / 3) % 2)})`; c.fillRect(0, y, w, 1); }
  mottle(c, w, h, seed, 10, 5);
}, { clamp: true });
export const ironTex = (seed) => canvasTex(256, 256, (c, w, h) => {
  const r = rng(seed); c.fillStyle = '#2c4a3d'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 150; i++) { const v = r(); c.fillStyle = v < 0.55 ? `rgba(122,62,32,${0.5 + r() * 0.5})` : v < 0.8 ? 'rgba(70,40,26,0.9)' : 'rgba(165,170,160,0.55)'; c.beginPath(); c.ellipse(r() * w, r() * h, 2 + r() * 12, 2 + r() * 7, r() * 3, 0, 7); c.fill(); }
  mottle(c, w, h, seed, 10, 10);
});
export const knitTex = () => canvasTex(128, 1024, (c, w, h) => {
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 8) { const g = c.createLinearGradient(x, 0, x + 8, 0); g.addColorStop(0, 'rgba(0,0,0,0.28)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.28)'); c.fillStyle = g; c.fillRect(x, 0, 8, h); }
  for (let y = 0; y < h; y += 6) { c.fillStyle = 'rgba(0,0,0,0.10)'; c.fillRect(0, y, w, 2); }
  c.fillStyle = 'rgba(40,0,0,0.55)'; for (const y of [40, 62, h - 48, h - 70]) c.fillRect(0, y, w, 9);
}, { clamp: true });
export const woodTex = (seed) => canvasTex(256, 256, (c, w, h) => {
  const r = rng(seed); c.fillStyle = '#c9c1b4'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(60,40,20,0.18)';
  for (let i = 0; i < 60; i++) { const y = r() * h; c.lineWidth = 0.5 + r() * 1.5; c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(w * 0.3, y + r() * 10 - 5, w * 0.6, y + r() * 10 - 5, w, y + r() * 8 - 4); c.stroke(); }
});
export const picTex = (seed) => canvasTex(256, 320, (c, w, h) => {
  const r = rng(seed); c.fillStyle = '#efe7d6'; c.fillRect(0, 0, w, h);
  if (seed % 2) { c.fillStyle = '#9fb7c4'; c.fillRect(24, 24, w - 48, h * 0.42); c.fillStyle = '#31506a'; c.fillRect(24, 24 + h * 0.42, w - 48, h * 0.3); c.fillStyle = '#2a2622'; for (let i = 0; i < 9; i++) { const x = 30 + i * 22; c.fillRect(x, h * 0.42 - r() * 26, 18, 30 + r() * 20); } c.fillRect(120, h * 0.2, 5, 70); c.beginPath(); c.arc(100, h * 0.38, 26, Math.PI, 0); c.fill(); }
  else { for (let i = 0; i < 7; i++) { c.fillStyle = ['#b5523a', '#d9a441', '#2f4660', '#6f8a6a'][i % 4]; c.globalAlpha = 0.85; c.beginPath(); c.arc(40 + r() * (w - 80), 40 + r() * (h - 80), 18 + r() * 44, 0, 7); c.fill(); } c.globalAlpha = 1; }
}, { clamp: true });
export const plasterTex = (seed) => canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#f4f2ec'; c.fillRect(0, 0, w, h); mottle(c, w, h, seed, 5, 3); });
export const roofingTex = (seed) => canvasTex(512, 512, (c, w, h) => { const r = rng(seed); c.fillStyle = '#a9a39a'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(${r() < 0.5 ? '60,56,50' : '200,196,188'},${0.05 + r() * 0.10})`; c.beginPath(); c.ellipse(r() * w, r() * h, 20 + r() * 80, 12 + r() * 50, r() * 3, 0, 7); c.fill(); }
  c.strokeStyle = 'rgba(40,38,34,0.25)'; c.lineWidth = 2; for (let x = 0; x < w; x += 128) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } mottle(c, w, h, seed, 14, 12); });
