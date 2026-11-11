import * as THREE from 'three';
import { buildTimeline, JUMP_T, LABELS, FPS, DURATION } from './timeline.js';
import { LY, DEG, dirFromAzPitch, clamp, sstep, len, norm, mul } from './util.js';
import { Post } from './post.js';
import { Hud } from './hud.js';
import { Hand } from './hand.js';
import { Pano } from './pano.js';

THREE.Object3D.DEFAULT_UP.set(0, 0, 1);
const q = new URLSearchParams(location.search);
const W = +(q.get('w') || 1920), H = Math.round(W * 9 / 16);
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, H, false); canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = !q.get('noshadow'); renderer.shadowMap.type = q.get('sm') === 'basic' ? THREE.BasicShadowMap : THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = false;

const tl = buildTimeline(); window.tl = tl;
const post = new Post(renderer, W, H, +(q.get('msaa') ?? 0)), hud = new Hud(1920, 1080), hand = new Hand();
const camera = new THREE.PerspectiveCamera(48, 16 / 9, 0.05, 40000); camera.up.set(0, 0, 1);
const pano = new Pano(renderer, +(q.get('pano') || 2560));

const stages = {}; const only = q.get('stages');
const stageOf = (stop) => stop <= 4 ? 'istanbul' : stop === 5 ? 'ridge' : 'space';
async function getStage(name) {
  if (!stages[name]) {
    if (name === 'istanbul') stages[name] = (await import('./istanbul.js')).buildIstanbul(tl);
    else if (name === 'ridge') stages[name] = (await import('./ridge.js')).buildRidge(tl);
    else stages[name] = (await import('./space.js')).buildSpace(tl, renderer);
  }
  return stages[name];
}

// ---------- hand choreography ----------
function handState(t) {
  let raise = 0, press = 0, tremble = 0;
  for (let j = 0; j < JUMP_T.length; j++) {
    const T = JUMP_T[j]; let t0 = T - 1.7; if (j === 3) t0 = 61.4; if (j === 27) t0 = 591.9;
    raise = Math.max(raise, sstep(t0, t0 + 0.9, t) * (1 - sstep(T + 0.45, T + 1.3, t)));
    press = Math.max(press, sstep(T - 0.10, T - 0.01, t) * (1 - sstep(T + 0.05, T + 0.22, t)));
  }
  if (t > 62 && t < 70) { tremble = 1; press = Math.max(press, 0.4 * sstep(65.3, 65.8, t) * (1 - sstep(66.2, 66.9, t))); }
  if (t > 592.5 && t < 596) { tremble = 0.6; press = Math.max(press, 0.3 * sstep(593.6, 594.0, t) * (1 - sstep(594.3, 594.9, t))); }
  const reach = sstep(15.4, 16.9, t) * (1 - sstep(19.4, 20.6, t));
  return { raise, press, reach, tremble };
}
const flashAt = (t) => { let f = 0; for (const T of JUMP_T) { const d = t - T; if (d >= -1e-6 && d < 0.14) f = Math.max(f, d < 1 / FPS - 1e-6 ? 1 : d < 2 / FPS - 1e-6 ? 0.3 : d < 3 / FPS - 1e-6 ? 0.1 : 0.03); } return f; };

// ---------- exposure adaptation, precomputed so that any frame can be rendered on its own ----------
let expo = null, gains = null;
async function buildExposure() {
  const dt = 0.1, n = Math.ceil(DURATION / dt) + 2; expo = new Float32Array(n); gains = new Float32Array(n); let e = null, g = 1, lastStop = -1;
  for (let i = 0; i < n; i++) {
    const t = i * dt, stop = tl.stopAt(t); const st = stages[stageOf(stop)]; const o = tl.orientAt(t);
    const [te, tg] = st ? st.adapt(t, stop, dirFromAzPitch(o.az, o.p)) : [1, 1];
    if (e === null) { e = te; g = tg; } else if (stop !== lastStop) { e = e + (te - e) * 0.55; g = g + (tg - g) * 0.5; } else { e += (te - e) * (1 - Math.exp(-dt / 1.1)); g += (tg - g) * (1 - Math.exp(-dt / (tg > g ? 2.2 : 0.7))); }
    lastStop = stop; expo[i] = e; gains[i] = g;
  }
}
const lerpArr = (arr, t) => { const x = t / 0.1, i = Math.floor(x); return arr[i] + (arr[i + 1] - arr[i]) * (x - i); };
const expAt = (t) => lerpArr(expo, t);

const fmtLy = (m) => { const ly = m / LY; return ly >= 1e9 ? (ly / 1e9).toFixed(1) + ' BILLION LY' : (ly / 1e6).toFixed(0) + ' MILLION LY'; };
const v3 = new THREE.Vector3();
window.renderAt = async (t) => {
  const stop = tl.stopAt(t); const stage = await getStage(stageOf(stop));
  if (!expo) { for (const n of (only ? only.split(',') : ['istanbul', 'ridge', 'space'])) await getStage(n); await buildExposure(); }
  await stage.prepare(stop);
  const o = tl.orientAt(t), sw = tl.sway(t, stop >= 6 ? 0.7 : 1);
  const dir = dirFromAzPitch(o.az + sw.az, o.p + sw.p);
  camera.fov = 48; camera.position.set(0, 0, 0); camera.up.set(0, 0, 1); camera.lookAt(dir[0], dir[1], dir[2]); camera.rotateZ(sw.roll * DEG);
  const ctx = { t, stop, dir, gain: lerpArr(gains, t) };
  stage.setCamera(camera, ctx);
  if (stage.isLive(t, stop)) stage.renderStatic(renderer, post.rt, camera, stop);
  else if (stage.hasStatic && !stage.hasStatic(stop)) { renderer.setRenderTarget(post.rt); renderer.setClearColor(0x000000, 1); renderer.clear(); }
  else {
    const [n, f] = stage.range(stop); const key = stage.name + stop;
    pano.bake(key, [camera.position.x, camera.position.y, camera.position.z], n, f, (cam, rt) => stage.renderStatic(renderer, rt, cam, stop));
    for (const pm of pano.mats) pm.uniforms.unit.value = 1;
    pano.draw(post.rt, camera, 1);
  }
  const info = stage.renderDynamic(renderer, post.rt, camera, ctx);
  // hand
  const hs = handState(t); hand.update(hs, t);
  if (hand.root.visible) {
    const L = info.hand; camera.updateMatrixWorld(); v3.set(...L.worldDir).transformDirection(camera.matrixWorldInverse);
    hand.render(renderer, post.handRT, { ...L, dir: v3 });
  }
  // HUD
  const h = { label: LABELS[stop] };
  if (t >= 586.6) {
    const P = tl.P[stop]; const d = len(P); v3.set(-P[0] / d, -P[1] / d, -P[2] / d).transformDirection(camera.matrixWorldInverse);
    const f = 1 / Math.tan(24 * DEG), a = clamp((t - 586.6) / 0.5) * (t < 587.6 ? 0.55 + 0.45 * Math.sign(Math.sin((t - 586.6) * 22)) : 1);
    let sx = v3.x / -v3.z * f / (16 / 9), sy = v3.y / -v3.z * f; const front = v3.z < 0 && Math.abs(sx) < 0.9 && Math.abs(sy) < 0.82;
    if (front) h.home = { x: Math.round((sx * 0.5 + 0.5) * 1920), y: Math.round((1 - (sy * 0.5 + 0.5)) * 1080), behind: false, alpha: +a.toFixed(2), dist: fmtLy(d) };
    else {
      let ex = v3.x, ey = v3.y; const m = Math.hypot(ex, ey); if (m < 0.12) { ex = 0; ey = -1; } else { ex /= m; ey /= m; }
      const k = Math.min(0.86 / Math.max(Math.abs(ex), 1e-6), 0.78 / Math.max(Math.abs(ey), 1e-6));
      h.home = { x: Math.round((ex * k * 0.5 + 0.5) * 1920), y: Math.round((1 - (ey * k * 0.5 + 0.5)) * 1080), behind: true, rot: +(Math.atan2(-ex, -ey)).toFixed(3), alpha: +a.toFixed(2), dist: fmtLy(d) };
    }
  }
  hud.draw(h);
  post.finish({ bloom: q.get('nobloom') ? 0 : info.bloom, threshold: info.threshold, radius: info.radius, exposure: expAt(t) * (info.expMul ?? 1), flash: flashAt(t), seed: (Math.round(t * FPS) % 977) * 0.731, hud: hud.tex, vig: info.vig, grain: info.grain, hand: hand.root.visible, handExp: info.hand.exp ?? 1 });
  return true;
};
window.frameJpeg = async (t, qual = 0.95) => { await window.renderAt(t); return canvas.toDataURL('image/jpeg', qual); };
await document.fonts.load('500 20px "Space Grotesk"'); await document.fonts.load('700 20px "Space Grotesk"');
window.ready = true;
window.__dbg = { renderer, post, camera, getStage, THREE, hand, hud };
