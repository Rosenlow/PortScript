// Offline bake of the galaxy panoramas: emission/absorption ray-march through an analytic galaxy model.
// One model serves every stop: the band seen from inside, the disc from above, and neighbours from afar.
import * as THREE from 'three';
import { buildTimeline, fromGal } from '/src/timeline.js';
import { LY, sub, mul, add, dot, cross, norm } from '/src/util.js';
const FACES = [[[1, 0, 0], [0, 0, 1]], [[-1, 0, 0], [0, 0, 1]], [[0, 1, 0], [0, 0, 1]], [[0, -1, 0], [0, 0, 1]], [[0, 0, 1], [0, 1, 0]], [[0, 0, -1], [0, 1, 0]]];
const tl = buildTimeline(), W = tl.W, P = tl.P, KLY = 1e3 * LY;
const g2e = (g) => add(add(mul(W.galX, g[0]), mul(W.galY, g[1])), mul(W.galN, g[2]));
const basis = (n) => { const x = norm(cross(Math.abs(n[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0], n)); return [x, cross(n, x), n]; };
const MWi = { c: W.galC, ax: [W.galX, W.galY, W.galN], scale: 1, type: 0, seed: 0, bright: 1 };
const LG = W.localGroup.map((g) => ({ c: fromGal(g.g), ax: basis(g.nrm ? norm(g2e(g.nrm)) : norm(g2e([0.3, 0.2, 0.93]))), scale: g.diam / 110, type: g.type, seed: g.seed, bright: g.type === 2 ? 0.8 : 1 }));
const TR = W.trio.map((g) => ({ c: g.pos, ax: basis(g.nrm), scale: g.diam / 110, type: g.type, seed: g.seed, bright: 1 }));
export const BAKES = {
  sun: { cam: W.sun, inst: [MWi], exposure: 1.15, steps: 170, grain: 1 },
  s20: { cam: P[20], inst: [MWi], exposure: 1.15, steps: 170, grain: 1 },
  s21: { cam: P[21], inst: [MWi], exposure: 2.2, steps: 256, grain: 0.5 },
  s22: { cam: P[22], inst: [MWi, LG[0], LG[1]], exposure: 3.2, steps: 160, grain: 0 },
  s23: { cam: P[23], inst: [MWi, ...LG], exposure: 3.6, steps: 140, grain: 0 },
  s25: { cam: P[25], inst: TR, exposure: 3.6, steps: 160, grain: 0 },
};
const FS = `
precision highp float;
uniform vec3 F, U, R; uniform int nInst; uniform vec3 iC[5], iX[5], iY[5], iZ[5]; uniform vec4 iP[5]; uniform float exposure, grain; uniform int steps; uniform vec2 res, off;
float h31(vec3 p){ p = fract(p*vec3(443.897,441.423,437.195)); p += dot(p, p.yzx+19.19); return fract((p.x+p.y)*p.z); }
float vn3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x), mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x), f.y), mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x), mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x), f.y), f.z); }
float fbm(vec3 p){ return 0.55*vn3(p)+0.28*vn3(p*2.07+1.7)+0.17*vn3(p*4.3+4.1); }
float sech2(float x){ float c = 2.0/(exp(x)+exp(-x)); return c*c; }
void spiral(vec3 q, float type, float seed, out vec3 em, out float kap){
  float r = length(q.xy), z = q.z; em = vec3(0.0); kap = 0.0;
  float thin = type > 2.5 ? 0.75 : 1.0;
  if (r > 62.0 || abs(z) > 6.0) return;
  float edge = smoothstep(60.0, 47.0, r);
  float th = atan(q.y, q.x); float pitch = 0.31 + 0.05*sin(seed*1.3); float lr = log(max(r, 0.5)/4.0)/pitch;
  float wob = (vn3(vec3(q.xy*0.07, seed))-0.5)*3.4 + (vn3(vec3(q.xy*0.21, seed+3.0))-0.5)*1.7 + (vn3(vec3(q.xy*0.6, seed+9.0))-0.5)*0.8;
  float ph = th - lr;
  float arm = max(pow(0.5+0.5*cos(2.0*ph + wob), 2.4), 0.5*pow(0.5+0.5*cos(4.0*ph + 1.3 + wob*1.7), 4.0)) * smoothstep(3.0, 7.0, r);
  float armD = max(pow(0.5+0.5*cos(2.0*ph + wob + 0.45), 2.4), 0.5*pow(0.5+0.5*cos(4.0*ph + 1.75 + wob*1.7), 4.0)) * smoothstep(2.5, 6.0, r);
  float n = fbm(q*vec3(0.45,0.45,1.4)+seed); vec2 r1 = vec2(0.8*q.x-0.6*q.y, 0.6*q.x+0.8*q.y), r2 = vec2(0.33*q.x+0.94*q.y, -0.94*q.x+0.33*q.y);
  float nh = 0.55*vn3(vec3(r1*1.5, q.z*3.0)+seed*2.0) + 0.45*vn3(vec3(r2*2.6, q.z*3.0)+seed) + 0.12;
  float sz = sech2(z/(0.45*thin)), szy = sech2(z/(0.24*thin)), szd = sech2(z/(0.15*thin));
  em += vec3(1.0,0.76,0.48) * exp(-r/24.0)*edge * sz * (0.22 + 0.75*arm) * (0.4+1.2*n) * 0.9;
  float yd = exp(-r/38.0)*edge*szy;
  em += vec3(0.36,0.56,1.0) * yd * arm * (0.15+2.4*n*n) * 2.6;
  em += vec3(0.78,0.88,1.0) * smoothstep(0.72,0.93, nh) * arm * yd * 3.8;
  em += vec3(1.0,0.28,0.42) * smoothstep(0.74,0.9, 0.5*vn3(vec3(r2*2.1, q.z*3.0)+11.0+seed)+0.5*vn3(vec3(r1*3.3, q.z*3.0)+5.0)+0.1) * arm*arm * yd * 4.5;
  float cb = cos(0.45+seed), sb = sin(0.45+seed); vec2 bq = vec2(cb*q.x+sb*q.y, -sb*q.x+cb*q.y); float bs = type > 2.5 ? 0.6 : 1.0;
  float rb = length(vec3(bq.x/(3.4*bs), bq.y/(1.6*bs), z/(1.2*bs)));
  em += vec3(1.0,0.75,0.46) * (3.0*exp(-rb*2.2) + 9.0*exp(-rb*7.0));
  kap = 1.5 * exp(-r/30.0)*edge * szd * (0.16 + 2.5*pow(armD, 1.3)) * (0.2 + 2.4*n*n) * smoothstep(1.0, 4.0, r) * (type > 2.5 ? 1.7 : 1.0);
}
void elliptical(vec3 q, out vec3 em, out float kap){ float r = length(q*vec3(1.0,1.3,1.55)); kap = 0.0; em = vec3(1.0,0.80,0.56) * (3.2*exp(-pow(r/5.0, 0.55)*1.9) ) * smoothstep(62.0, 30.0, r); }
void irregular(vec3 q, float seed, out vec3 em, out float kap){ float r = length(q.xy); float n = fbm(q*0.16+seed); float sz = sech2(q.z/5.0);
  float cb = cos(seed), sb = sin(seed); vec2 bq = vec2(cb*q.x+sb*q.y, -sb*q.x+cb*q.y);
  em = vec3(0.72,0.82,1.0) * exp(-r/15.0)*sz*(0.15+2.0*n*n)*0.9*smoothstep(60.0,35.0,r) + vec3(1.0,0.85,0.65)*0.7*exp(-length(vec3(bq.x/14.0, bq.y/4.5, q.z/3.5))*1.6);
  em += vec3(1.0,0.3,0.45)*smoothstep(0.78,0.92, vn3(q*0.6+seed+5.0))*exp(-r/18.0)*sz*2.5; kap = 0.25*exp(-r/15.0)*sech2(q.z/2.0)*n*n; }
void main(){
  vec2 uv = (gl_FragCoord.xy + off) / res * 2.0 - 1.0; vec3 d = normalize(F + R*uv.x + U*uv.y);
  float jit = h31(vec3(gl_FragCoord.xy + off, 7.0));
  vec3 col = vec3(0.0), T = vec3(1.0);
  for (int i = 0; i < 5; i++) { if (i >= nInst) break;
    float s = iP[i].x, type = iP[i].y, seed = iP[i].z, br = iP[i].w;
    vec3 o = -vec3(dot(iC[i], iX[i]), dot(iC[i], iY[i]), dot(iC[i], iZ[i])) / s; vec3 dl = vec3(dot(d, iX[i]), dot(d, iY[i]), dot(d, iZ[i]));
    float b = dot(o, dl), c = dot(o, o) - 64.0*64.0, disc = b*b - c; if (disc < 0.0) continue;
    float sq = sqrt(disc), t0 = max(-b - sq, 0.0), t1 = -b + sq; if (t1 <= 0.0) continue;
    if (type < 0.5 || type > 2.5) { // clip to the disc slab
      if (abs(dl.z) > 1e-5) { float ta = (-6.0 - o.z)/dl.z, tb = (6.0 - o.z)/dl.z; t0 = max(t0, min(ta, tb)); t1 = min(t1, max(ta, tb)); } else if (abs(o.z) > 6.0) continue;
      if (t1 <= t0) continue; }
    float ds = (t1 - t0) / float(steps);
    for (int k = 0; k < 256; k++) { if (k >= steps) break;
      vec3 q = o + dl * (t0 + (float(k) + jit) * ds); vec3 em; float kap;
      if (type < 0.5 || type > 2.5) spiral(q, type, seed, em, kap); else if (type < 1.5) elliptical(q, em, kap); else irregular(q, seed, em, kap);
      vec3 a = exp(-kap * ds * vec3(0.72, 1.0, 1.38));
      col += T * em * br * ds * (kap > 1e-4 ? (1.0 - a) / (kap * ds * vec3(0.72, 1.0, 1.38)) : vec3(1.0));
      T *= a; if (T.g < 0.004) break; }
  }
  col *= 0.11 * exposure; col = max(col - 0.02, 0.0);
  if (grain > 0.0) { vec3 cell = floor(d * res.x * 0.55); float g = h31(cell); float lum = dot(col, vec3(0.33)); col += col * grain * (smoothstep(0.93, 1.0, g) * 5.0 * smoothstep(0.02, 0.2, lum) + (h31(cell*1.7+3.0) - 0.5) * 0.5); }
  col = 1.0 - exp(-col);
  col = pow(max(col, 0.0), vec3(1.0/2.2)) + (h31(vec3(gl_FragCoord.xy, 3.0)) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}`;
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true }); renderer.setPixelRatio(1); document.body.appendChild(renderer.domElement);
const V3 = (n) => Array.from({ length: n }, () => new THREE.Vector3());
const mat = new THREE.ShaderMaterial({ depthTest: false, uniforms: { F: { value: new THREE.Vector3() }, U: { value: new THREE.Vector3() }, R: { value: new THREE.Vector3() }, nInst: { value: 0 }, iC: { value: V3(5) }, iX: { value: V3(5) }, iY: { value: V3(5) }, iZ: { value: V3(5) }, iP: { value: Array.from({ length: 5 }, () => new THREE.Vector4()) }, exposure: { value: 1 }, grain: { value: 0 }, steps: { value: 100 }, res: { value: new THREE.Vector2() }, off: { value: new THREE.Vector2() } },
  vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: FS });
const scene = new THREE.Scene(); const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false; scene.add(quad); const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const out = document.createElement('canvas');
window.bakeFace = async (id, face, size, quality = 0.93, view = null) => {
  const B = BAKES[id], u = mat.uniforms, TILE = 512; renderer.setSize(TILE, TILE, false); out.width = out.height = size; const ctx = out.getContext('2d');
  const [f, up] = FACES[face]; u.F.value.set(...f); u.U.value.set(...up); u.R.value.crossVectors(u.F.value, u.U.value);
  if (view) { const d = norm(sub(view.target === 'gc' ? W.galC : view.target === 'trio' ? W.trioC : view.target, B.cam)); const r = norm(cross(d, [0, 0, 1])), up2 = cross(r, d), k = Math.tan(view.fov * Math.PI / 360); u.F.value.set(...d); u.R.value.set(...mul(r, k)); u.U.value.set(...mul(up2, k)); }
  u.nInst.value = B.inst.length; B.inst.forEach((I, i) => { const c = mul(sub(I.c, B.cam), 1 / KLY); u.iC.value[i].set(...c); u.iX.value[i].set(...I.ax[0]); u.iY.value[i].set(...I.ax[1]); u.iZ.value[i].set(...I.ax[2]); u.iP.value[i].set(I.scale, I.type, I.seed, I.bright); });
  u.exposure.value = B.exposure; u.grain.value = B.grain; u.steps.value = B.steps; u.res.value.set(size, size);
  for (let ty = 0; ty < size; ty += TILE) for (let tx = 0; tx < size; tx += TILE) {
    u.off.value.set(tx, ty); renderer.render(scene, cam);
    ctx.drawImage(renderer.domElement, 0, 0, TILE, TILE, tx, size - ty - TILE, TILE, TILE);       // GL y is up; image top = +U
    await new Promise((r) => setTimeout(r, 0));
  }
  return out.toDataURL('image/jpeg', quality);
};
window.ready = true;
