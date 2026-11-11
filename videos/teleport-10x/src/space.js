import * as THREE from 'three';
import { feature } from '/node_modules/topojson-client/src/index.js';
import { LY, DEG, add, sub, mul, dot, cross, len, norm, clamp, sstep, lerp, rng, angleBetween, viewBasis, offsetDir } from './util.js';
import { toGal, fromGal } from './timeline.js';
import { sampleWeb } from './web.js';
import { canvasTex } from './textures.js';

const KM = 1e3, MLY = 1e6 * LY;
const FACES = [[[1, 0, 0], [0, 0, 1]], [[-1, 0, 0], [0, 0, 1]], [[0, 1, 0], [0, 0, 1]], [[0, -1, 0], [0, 0, 1]], [[0, 0, 1], [0, 1, 0]], [[0, 0, -1], [0, 1, 0]]];
export const BAKE_OF = (stop) => stop >= 6 && stop <= 19 ? 'sun' : stop >= 20 && stop <= 23 ? 's' + stop : stop === 25 ? 's25' : null;

const STAR_VS = `
attribute float lum; attribute vec3 color; uniform vec3 camP; uniform float gain, px, sizeK; varying vec3 vC; varying float vI;
void main(){ vec3 rel = position - camP; float d2 = dot(rel, rel); float flux = lum / max(d2, 1e-6) * gain;
  float s = pow(flux, 0.27); float size = (1.25 + 5.6*s) * sizeK; vI = min(pow(flux, 0.55) * 1.9, 2.6); vC = color;
  if (flux < 0.0012) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 1.0; return; }
  vec4 p = projectionMatrix * viewMatrix * vec4(cameraPosition + normalize(rel), 1.0); p.z = p.w * 0.99995; gl_Position = p; gl_PointSize = size * px; }`;
const STAR_FS = `varying vec3 vC; varying float vI; void main(){ vec2 q = gl_PointCoord*2.0-1.0; float r2 = dot(q,q); if (r2 > 1.0) discard; float a = exp(-r2*4.2) + 0.25*exp(-r2*14.0); gl_FragColor = vec4(vC * vI * a, 1.0); }`;

const GAL_VS = `
attribute float lum, diam, kind, seed; attribute vec3 nrm, color; uniform vec3 camP; uniform float gain, px, pxPerRad; varying vec3 vC; varying float vI, vQ, vAng, vKind, vSize, vSeed;
void main(){ vec3 rel = position - camP; float d = length(rel); vec3 dir = rel / d; float ang = diam / d;       // radians
  float truePx = ang * pxPerRad; float size = clamp(truePx * 1.5, 2.2, 150.0);
  float fill = min(1.0, truePx / 2.2); vI = lum * gain * (0.16 + 0.84*fill*fill) * mix(1.0, 0.7, smoothstep(6.0, 60.0, truePx)); vC = color; vKind = kind; vSize = size; vSeed = seed;
  vec3 nv = mat3(viewMatrix) * nrm; vQ = kind > 0.5 && kind < 1.5 ? 0.72 : max(abs(dot(nrm, dir)), 0.16); vAng = atan(nv.y, nv.x);
  if (lum <= 0.0 || d < 1e-6) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 1.0; return; }
  vec4 p = projectionMatrix * viewMatrix * vec4(cameraPosition + dir, 1.0); p.z = p.w * 0.9999; gl_Position = p; gl_PointSize = size * px; }`;
const GAL_FS = `varying vec3 vC; varying float vI, vQ, vAng, vKind, vSize, vSeed;
void main(){ vec2 q = gl_PointCoord*2.0-1.0; q.y = -q.y; float c = cos(vAng), s = sin(vAng); vec2 e = vec2(c*q.x + s*q.y, -s*q.x + c*q.y); e.x /= vQ;      // e.x along projected normal (minor axis)
  float r = length(e); if (r > 1.0) discard; float I = exp(-r*5.0) * 1.2 + exp(-r*r*40.0) * 0.9; vec3 col = vC;
  if (vKind < 0.5 && vSize > 9.0) { float th = atan(e.y, e.x); float arm = 0.5 + 0.5*cos(2.0*(th - 3.2*log(r+0.05)) + vSeed); I *= 0.55 + 0.9*arm*smoothstep(0.08, 0.3, r); col = mix(vec3(1.0,0.85,0.65), col, smoothstep(0.05,0.35,r)); }
  I *= smoothstep(1.0, 0.75, r); gl_FragColor = vec4(col * I * vI, 1.0); }`;
const DOT_VS = `
attribute float kind; uniform vec3 camP; uniform float px, reveal, range, sizeK, alphaK; varying float vA;
void main(){ vec3 rel = position - camP; float d = length(rel); float size = clamp(sizeK / max(d, 1.0), 1.5, 4.6);
  vA = alphaK * (1.0 - smoothstep(range*0.55, range, d)) * smoothstep(reveal, reveal*0.82, d) * (0.45 + 0.55*size/4.6);
  if (vA < 0.004) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 1.0; return; }
  vec4 p = projectionMatrix * viewMatrix * vec4(cameraPosition + rel/d, 1.0); p.z = p.w * 0.9998; gl_Position = p; gl_PointSize = size * px; }`;
const DOT_FS = `varying float vA; uniform vec3 tint; void main(){ vec2 q = gl_PointCoord*2.0-1.0; float r2 = dot(q,q); if (r2 > 1.0) discard; gl_FragColor = vec4(tint * vA * smoothstep(1.0, 0.45, r2), 1.0); }`;

const EARTH_FS = `
uniform mat4 modelMatrix; uniform sampler2D tDay, tNight, tCloud, tReg; uniform vec3 sunW, camW; uniform vec4 reg; uniform float detail;
varying vec3 vObj; varying vec3 vWorld; varying vec3 vNw;
float h31(vec3 p){ p = fract(p*vec3(443.897,441.423,437.195)); p += dot(p, p.yzx+19.19); return fract((p.x+p.y)*p.z); }
float vn3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x), mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x), f.y), mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x), mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x), f.y), f.z); }
float fbm(vec3 p){ return 0.5*vn3(p)+0.25*vn3(p*2.03)+0.125*vn3(p*4.01)+0.0625*vn3(p*8.1); }
vec2 llToUv(vec3 p){ return vec2(atan(p.y, p.x)/6.2831853+0.5, asin(clamp(p.z,-1.0,1.0))/3.14159265+0.5); }
void main(){
  vec3 p = normalize(vObj); vec3 N = normalize(vNw); vec3 V = normalize(camW - vWorld);
  vec2 uv = llToUv(p); float lonD = (uv.x-0.5)*360.0, latD = (uv.y-0.5)*180.0;
  vec3 base = texture2D(tDay, uv).rgb;
  // regional detail around the Sea of Marmara
  vec2 ruv = vec2((lonD-reg.x)/(reg.y-reg.x), (latD-reg.z)/(reg.w-reg.z));
  float w = smoothstep(0.0,0.22,ruv.x)*smoothstep(1.0,0.78,ruv.x)*smoothstep(0.0,0.25,ruv.y)*smoothstep(1.0,0.75,ruv.y)*detail;
  float seaMask = 1.0;
  if (w > 0.001) {
    vec4 rg = texture2D(tReg, ruv); float n1 = fbm(p*900.0), n2 = fbm(p*4200.0+3.0), n3 = vn3(p*16000.0);
    vec3 forest = vec3(0.045,0.085,0.035), field = vec3(0.17,0.16,0.085), dry = vec3(0.24,0.2,0.13);
    float north = smoothstep(40.6, 41.6, latD + (n1-0.5)*1.2);
    vec3 land = mix(mix(field, dry, n2), forest, clamp(north*0.75 + (n1-0.45)*1.3, 0.0, 1.0)); land *= (0.8 + 0.4*n3)*1.9;
    land = mix(land, vec3(0.50,0.48,0.45)*(0.75+0.5*n3), clamp(rg.b*1.3,0.0,1.0));
    float shallow = smoothstep(0.02, 0.5, rg.g);
    vec3 sea = mix(vec3(0.008,0.035,0.085), vec3(0.02,0.11,0.16), shallow*0.8) * (0.9+0.2*n1);
    vec3 rc = mix(sea, land, smoothstep(0.42,0.58,rg.r)); base = mix(base, rc, w); seaMask = mix(1.0, 1.0-smoothstep(0.42,0.58,rg.r), w);
  }
  float ndl = dot(N, sunW); float day = smoothstep(-0.10, 0.22, ndl);
  // clouds (thinned over Istanbul so the city stays readable) + their shadows
  vec3 sunT = normalize(sunW - N*ndl);
  float dIst = distance(vec2(lonD*0.75, latD), vec2(29.0*0.75, 41.0));
  float thin = mix(0.10, 1.0, smoothstep(2.0, 9.0, dIst));
  float cn = fbm(p*260.0); float cl = texture2D(tCloud, uv).a; cl = clamp(cl*(0.55+0.9*cn), 0.0, 1.0)*thin;
  float puffs = smoothstep(0.60, 0.74, fbm(p*1500.0+7.0)) * smoothstep(0.45,0.6,fbm(p*320.0+2.0)) * smoothstep(4.5, 1.2, dIst) * 0.85 * detail * detail; cl = max(cl, puffs);
  vec3 ps = normalize(p - (inverse(mat3(modelMatrix))*sunT)*0.0011);
  float cs = texture2D(tCloud, llToUv(ps)).a*thin; cs = max(cs*(0.55+0.9*fbm(ps*260.0)), smoothstep(0.60, 0.74, fbm(ps*1500.0+7.0))*smoothstep(0.45,0.6,fbm(ps*320.0+2.0))*smoothstep(4.5, 1.2, dIst)*0.85*detail*detail);
  vec3 col = base * (1.0 - 0.55*cs);
  float light = pow(max(ndl, 0.0), 0.62)*1.3 + 0.02;
  vec3 warm = mix(vec3(1.0,0.55,0.3), vec3(1.0), smoothstep(0.0, 0.3, ndl));
  col = col * light * warm;
  vec3 R = reflect(-sunW, N); col += vec3(1.0,0.9,0.75) * pow(max(dot(R, V),0.0), 60.0) * 0.5 * seaMask * step(0.0, ndl) * (1.0-cl) * smoothstep(0.1, 0.0, base.r-base.b+0.05);
  col = mix(col, vec3(1.0)*(pow(max(ndl,0.0),0.62)*1.35+0.02)*warm, cl);
  col += texture2D(tNight, uv).rgb * vec3(1.0,0.8,0.5) * smoothstep(0.03, -0.14, ndl) * 0.3 * (1.0-cl);
  float fr = pow(1.0 - max(dot(N, V), 0.0), 3.2);
  col = mix(col, vec3(0.22,0.42,0.95)*day, 0.04 + 0.42*fr); col += vec3(0.25,0.5,1.0)*fr*day*0.3;
  gl_FragColor = vec4(col*1.15, 1.0);
}`;
const ATMO_FS = `
uniform vec3 sunW, camW, cW; uniform float R, H; varying vec3 vWorld;
void main(){ vec3 d = normalize(vWorld - camW); vec3 oc = cW - camW; float tca = dot(oc, d); float b = length(oc - d*tca);
  if (tca < 0.0) discard; float h = b - R; if (h < 0.0) discard;
  vec3 nc = normalize(camW + d*tca - cW); float lit = smoothstep(-0.25, 0.15, dot(nc, sunW));
  float g = exp(-h/H)*0.9 + exp(-h/(H*0.25))*1.2; vec3 col = mix(vec3(1.0,0.45,0.2), vec3(0.25,0.5,1.0), smoothstep(-0.1,0.25,dot(nc,sunW)));
  gl_FragColor = vec4(col*g*lit, 1.0); }`;

export function buildSpace(tl, renderer) {
  const W = tl.W, P = tl.P; const H = renderer.domElement.height, PX = H / 1080;
  const sunV = new THREE.Vector3(...W.sunDir);
  const stat = new THREE.Scene(), dyn = new THREE.Scene();
  const loader = new THREE.TextureLoader(); const img = (u, srgb = true) => { const t = loader.load(u); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 4; return t; };
  const tex = { day: img('/node_modules/three-globe/example/img/earth-blue-marble.jpg'), night: img('/node_modules/three-globe/example/img/earth-night.jpg'), cloud: img('/node_modules/three-globe/example/clouds/clouds.png', false) };
  for (const k in tex) { tex[k].wrapS = THREE.RepeatWrapping; }
  const REG = [25.5, 32.5, 39.25, 42.75];
  const regTex = new THREE.CanvasTexture(document.createElement('canvas')); regTex.colorSpace = THREE.NoColorSpace; regTex.anisotropy = 4;
  let ready = null;
  async function init() {
    // regional coastline mask from Natural Earth 1:10m (world-atlas)
    const topo = await (await fetch('/node_modules/world-atlas/land-10m.json')).json(); const land = feature(topo, topo.objects.land);
    const cw = 4096, ch = 2048, cv = regTex.image; cv.width = cw; cv.height = ch; const c = cv.getContext('2d', { willReadFrequently: true });
    const X = (lo) => (lo - REG[0]) / (REG[1] - REG[0]) * cw, Y = (la) => (1 - (la - REG[2]) / (REG[3] - REG[2])) * ch;
    const mask = document.createElement('canvas'); mask.width = cw; mask.height = ch; const m = mask.getContext('2d'); m.fillStyle = '#000'; m.fillRect(0, 0, cw, ch); m.fillStyle = '#fff';
    const polys = land.features ? land.features.flatMap((f) => f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates) : (land.geometry.type === 'Polygon' ? [land.geometry.coordinates] : land.geometry.coordinates);
    for (const poly of polys) { let hit = false; for (const pt of poly[0]) if (pt[0] > REG[0] - 3 && pt[0] < REG[1] + 3 && pt[1] > REG[2] - 3 && pt[1] < REG[3] + 3) { hit = true; break; } if (!hit) continue;
      m.beginPath(); for (const ring of poly) { ring.forEach((pt, i) => i ? m.lineTo(X(pt[0]), Y(pt[1])) : m.moveTo(X(pt[0]), Y(pt[1]))); m.closePath(); } m.fill('evenodd'); }
    const blur = document.createElement('canvas'); blur.width = cw; blur.height = ch; const b = blur.getContext('2d'); b.filter = 'blur(16px)'; b.drawImage(mask, 0, 0);
    const urb = document.createElement('canvas'); urb.width = cw; urb.height = ch; const u = urb.getContext('2d'); u.fillStyle = '#000'; u.fillRect(0, 0, cw, ch);
    const towns = [[28.95, 41.012, 9], [28.98, 41.04, 8], [28.99, 41.065, 8], [29.01, 41.05, 6], [29.03, 41.022, 8], [29.045, 40.99, 9], [28.87, 40.985, 10], [28.8, 41.0, 9], [28.72, 40.99, 9], [29.12, 40.94, 9], [29.19, 40.9, 8], [29.25, 40.875, 8], [29.12, 41.02, 10], [29.05, 41.11, 5], [28.64, 41.0, 8], [28.9, 41.06, 9], [28.85, 41.04, 8], [29.3, 40.84, 6], [29.43, 40.8, 6], [29.92, 40.77, 7], [29.06, 40.19, 10], [27.51, 40.98, 5], [27.8, 41.16, 5], [29.27, 40.65, 4], [30.4, 40.78, 6], [28.98, 40.36, 3], [26.4, 40.15, 3], [27.89, 39.65, 5], [30.5, 39.78, 7]];
    const rr = rng(9); for (const [lo, la, s] of towns) for (let k = 0; k < 14; k++) { const x = X(lo + rr.gauss() * s * 0.004), y = Y(la + rr.gauss() * s * 0.003), rad = s * (2 + rr() * 4); const g = u.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); u.fillStyle = g; u.fillRect(x - rad, y - rad, 2 * rad, 2 * rad); }
    const dm = m.getImageData(0, 0, cw, ch).data, db = b.getImageData(0, 0, cw, ch).data, du = u.getImageData(0, 0, cw, ch).data; const out = c.createImageData(cw, ch), o = out.data;
    for (let i = 0; i < cw * ch * 4; i += 4) { o[i] = dm[i]; o[i + 1] = db[i]; o[i + 2] = du[i]; o[i + 3] = 255; }
    c.putImageData(out, 0, 0); regTex.needsUpdate = true;
    await new Promise((res) => { const chk = () => (tex.day.image && tex.night.image && tex.cloud.image) ? res() : setTimeout(chk, 30); chk(); });
  }

  // ---------- Earth, atmosphere, Moon (static: baked into the panorama of stops 6-10) ----------
  const la = W.lat * DEG, lo = W.lon * DEG;
  const E = [-Math.sin(lo), Math.cos(lo), 0], N = [-Math.sin(la) * Math.cos(lo), -Math.sin(la) * Math.sin(lo), Math.cos(la)], U = [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
  const ecef2enu = new THREE.Matrix4().set(E[0], E[1], E[2], 0, N[0], N[1], N[2], 0, U[0], U[1], U[2], 0, 0, 0, 0, 1);
  const eU = { tDay: { value: tex.day }, tNight: { value: tex.night }, tCloud: { value: tex.cloud }, tReg: { value: regTex }, sunW: { value: sunV }, camW: { value: new THREE.Vector3() }, reg: { value: new THREE.Vector4(...REG) }, detail: { value: 1 } };
  const VS = 'varying vec3 vObj, vWorld, vNw; void main(){ vObj = position; vec4 w = modelMatrix*vec4(position,1.0); vWorld = w.xyz; vNw = mat3(modelMatrix)*normalize(position); gl_Position = projectionMatrix*viewMatrix*w; }';
  const earth = new THREE.Mesh(new THREE.SphereGeometry(6371, 720, 360).rotateX(Math.PI / 2), new THREE.ShaderMaterial({ uniforms: eU, vertexShader: VS, fragmentShader: EARTH_FS })); earth.matrixAutoUpdate = false; earth.frustumCulled = false; stat.add(earth);
  const aU = { sunW: { value: sunV }, camW: eU.camW, cW: { value: new THREE.Vector3() }, R: { value: 6371 }, H: { value: 22 } };
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(6371 * 1.06, 180, 90), new THREE.ShaderMaterial({ uniforms: aU, vertexShader: VS, fragmentShader: ATMO_FS, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); atmo.matrixAutoUpdate = false; atmo.frustumCulled = false; stat.add(atmo);
  const moonTex = canvasTex(1024, 512, (c, w, h) => { const r = rng(3); c.fillStyle = '#9a9792'; c.fillRect(0, 0, w, h); for (let i = 0; i < 26; i++) { c.fillStyle = `rgba(60,60,64,${0.25 + r() * 0.3})`; c.beginPath(); c.ellipse(r() * w, h * (0.2 + r() * 0.6), 30 + r() * 90, 20 + r() * 60, r() * 3, 0, 7); c.fill(); } for (let i = 0; i < 500; i++) { const x = r() * w, y = r() * h, s = 1 + r() * r() * 9; c.fillStyle = 'rgba(220,220,215,0.35)'; c.beginPath(); c.arc(x, y, s, 0, 7); c.fill(); c.fillStyle = 'rgba(40,40,40,0.3)'; c.beginPath(); c.arc(x + s * 0.2, y + s * 0.2, s * 0.75, 0, 7); c.fill(); } });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1737, 64, 32).rotateX(Math.PI / 2), new THREE.MeshLambertMaterial({ map: moonTex, color: new THREE.Color(1.7, 1.7, 1.7) })); moon.frustumCulled = false; stat.add(moon);
  const sunL = new THREE.DirectionalLight(0xffffff, 3.0); sunL.position.copy(sunV); stat.add(sunL); stat.add(new THREE.AmbientLight(0xffffff, 0.01));

  // ---------- star catalogues (light-years) ----------
  const starMat = (o = {}) => new THREE.ShaderMaterial({ uniforms: { camP: { value: new THREE.Vector3() }, gain: { value: 1 }, px: { value: PX }, sizeK: { value: 1 } }, vertexShader: STAR_VS, fragmentShader: STAR_FS, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true, transparent: true, ...o });
  function catalogue(centre, R, N, seed, extra = [], flat = 0) {
    const r = rng(seed), pos = new Float32Array((N + extra.length) * 3), lum = new Float32Array(N + extra.length), col = new Float32Array((N + extra.length) * 3);
    for (let i = 0; i < N; i++) {
      let p = mul(r.ball(), R); if (flat) { const z = dot(p, W.galN); p = sub(p, mul(W.galN, z * (1 - flat))); }
      let logL, c; if (r() < 0.012) { logL = 1.6 + r() * 2.1; c = r() < 0.6 ? [1.0, 0.72, 0.45] : [0.7, 0.8, 1.0]; } else { logL = -1.2 + r.gauss(); const k = clamp((logL + 1.5) / 3.2); c = [lerp(1.0, 0.82, k), lerp(0.72, 0.9, k), lerp(0.5, 1.0, k)]; }
      pos.set(p, i * 3); lum[i] = Math.pow(10, logL) * 12.4; col.set(c, i * 3);
    }
    extra.forEach((e, j) => { const i = N + j; pos.set(e.p, i * 3); lum[i] = e.lum; col.set(e.col, i * 3); });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('lum', new THREE.BufferAttribute(lum, 1)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(g, starMat()); pts.frustumCulled = false; pts.visible = false; pts.renderOrder = 2; dyn.add(pts); return { pts, centre };
  }
  const lyRel = (p, c) => mul(sub(p, c), 1 / LY);
  const catC = add(P[15], mul(W.triDir, 59 * LY));
  const tri = W.tri.map((s) => ({ p: lyRel(s.pos, catC), lum: Math.pow(10, -0.4 * s.mag) * s.d * s.d, col: s.col }));
  const cats = { A: catalogue(catC, 520, 300000, 11, tri), B: null, C: null };
  // ---------- Sun glare, planets ----------
  const glareTex = canvasTex(512, 512, (c, w) => { const g = c.createRadialGradient(256, 256, 0, 256, 256, 256); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.02, 'rgba(255,250,235,1)'); g.addColorStop(0.06, 'rgba(255,225,170,0.55)'); g.addColorStop(0.2, 'rgba(255,190,120,0.14)'); g.addColorStop(0.5, 'rgba(255,170,110,0.035)'); g.addColorStop(1, 'rgba(255,160,100,0)'); c.fillStyle = g; c.fillRect(0, 0, w, w);
    c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 6; i++) { c.save(); c.translate(256, 256); c.rotate(i * Math.PI / 6 + 0.26); const l = c.createLinearGradient(-256, 0, 256, 0); l.addColorStop(0, 'rgba(255,220,180,0)'); l.addColorStop(0.3, 'rgba(255,220,180,0)'); l.addColorStop(0.5, 'rgba(255,240,220,0.5)'); l.addColorStop(0.7, 'rgba(255,220,180,0)'); l.addColorStop(1, 'rgba(255,220,180,0)'); c.fillStyle = l; c.fillRect(-256, -1.2, 512, 2.4); c.restore(); } }, { clamp: true });
  const sunSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glareTex, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true, transparent: true, color: 0xffffff })); sunSpr.renderOrder = 5; dyn.add(sunSpr);
  const sunCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(64, 64, (c) => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,250,235,1)'); g.addColorStop(1, 'rgba(255,240,220,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); }, { clamp: true }), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, color: new THREE.Color(8, 8, 7) })); sunCore.renderOrder = 6; dyn.add(sunCore);
  // sun-centred ecliptic frame; planets as wandering "stars"
  const eclN = norm(cross(W.sunDir, W.moonDir)), eX = mul(W.sunDir, -1), eY = cross(eclN, eX);
  const planets = [{ a: 0.72, ph: 205, m: -4.2, c: [1, 0.97, 0.88] }, { a: 0.39, ph: 150, m: -1.0, c: [1, 0.9, 0.8] }, { a: 1.52, ph: 172, m: -1.2, c: [1, 0.62, 0.42] }, { a: 5.2, ph: 196, m: -2.4, c: [1, 0.92, 0.8] }, { a: 9.5, ph: 60, m: 0.4, c: [1, 0.9, 0.7] }]
    .map((p) => ({ ...p, pos: add(W.sun, mul(add(mul(eX, Math.cos(p.ph * DEG)), mul(eY, Math.sin(p.ph * DEG))), p.a * W.AU)) }));
  const bodyGeo = new THREE.BufferGeometry(); const NB = 8; bodyGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NB * 3), 3)); bodyGeo.setAttribute('lum', new THREE.BufferAttribute(new Float32Array(NB), 1)); bodyGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(NB * 3), 3));
  const bodies = new THREE.Points(bodyGeo, starMat()); bodies.frustumCulled = false; bodies.renderOrder = 3; dyn.add(bodies);
  function setBodies(stop) {
    const p = bodyGeo.attributes.position, l = bodyGeo.attributes.lum, c = bodyGeo.attributes.color; let i = 0; const cam = P[stop];
    const put = (pos, flux, col) => { const d = norm(sub(pos, cam)); p.setXYZ(i, d[0], d[1], d[2]); l.setX(i, flux); c.setXYZ(i, col[0], col[1], col[2]); i++; };
    for (const pl of planets) { const d = len(sub(pl.pos, cam)) / W.AU; put(pl.pos, stop >= 13 ? 0 : Math.pow(10, -0.4 * pl.m) * Math.min(1, 1 / (d * d)) * (stop <= 10 ? 0.5 : 0.35), pl.c); }
    const dE = len(sub(W.earthC, cam)); put(W.earthC, stop === 11 ? 4.5 : stop === 12 ? 1.25 : 0, [0.62, 0.78, 1.0]);
    put(W.moon, stop === 11 ? 0.12 : 0, [0.9, 0.9, 0.88]);
    for (; i < NB; i++) l.setX(i, 0);
    p.needsUpdate = l.needsUpdate = c.needsUpdate = true; bodies.material.uniforms.camP.value.set(0, 0, 0);
  }

  // ---------- baked galaxy panoramas (6 faces) ----------
  const skyGroup = new THREE.Group(); dyn.add(skyGroup); const skyMats = [];
  FACES.forEach(([f, u]) => {
    const F = new THREE.Vector3(...f), Uv = new THREE.Vector3(...u), R = new THREE.Vector3().crossVectors(F, Uv);
    const m = new THREE.ShaderMaterial({ depthTest: true, depthWrite: false, uniforms: { tex: { value: null }, F: { value: F }, U: { value: Uv }, R: { value: R }, gain: { value: 1 } },
      vertexShader: 'uniform vec3 F, U, R; varying vec2 vUv; void main(){ vUv = uv; vec3 d = F + R*position.x + U*position.y; vec4 p = projectionMatrix * viewMatrix * vec4(cameraPosition + d, 1.0); p.z = p.w*0.99999; gl_Position = p; }',
      fragmentShader: 'uniform sampler2D tex; uniform float gain; varying vec2 vUv; void main(){ vec3 c = texture2D(tex, vUv).rgb; gl_FragColor = vec4(c*c*(1.0+2.0*c)*gain, 1.0); }' });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m); mesh.frustumCulled = false; mesh.renderOrder = 0; skyGroup.add(mesh); skyMats.push(m);
  });
  let skyId = null;
  async function loadSky(id) {
    if (skyId === id) return; skyId = id; skyGroup.visible = !!id; if (!id) return;
    await Promise.all(skyMats.map((m, i) => new Promise((res, rej) => { loader.load(`/bake/out/${id}_${i}.jpg`, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = false; t.minFilter = t.magFilter = THREE.LinearFilter; if (m.uniforms.tex.value) m.uniforms.tex.value.dispose(); m.uniforms.tex.value = t; res(); }, undefined, () => { console.warn('missing bake ' + id + '_' + i); m.uniforms.tex.value = null; skyGroup.visible = false; res(); }); })));
  }

  // ---------- galaxies as sprites (Mly, origin = home) ----------
  const toM = (p) => mul(p, 1 / MLY);
  const special = [{ id: 'MW', p: toM(W.galC), diam: 0.11, nrm: W.galN, kind: 0, lum: 1.5 }, ...W.localGroup.map((g) => ({ id: g.name, p: toM(fromGal(g.g)), diam: g.diam / 1000, nrm: g.nrm ? norm(add(add(mul(W.galX, g.nrm[0]), mul(W.galY, g.nrm[1])), mul(W.galN, g.nrm[2]))) : W.galN, kind: g.type === 2 ? 2 : 0, lum: g.type === 2 ? 0.7 : 1.4 })),
    ...W.trio.map((g) => ({ id: g.name, p: toM(g.pos), diam: g.diam / 1000, nrm: g.nrm, kind: g.type === 1 ? 1 : 0, lum: 1.5 }))];
  const HIDE = { 22: ['MW', 'LMC', 'SMC'], 23: ['MW', 'LMC', 'SMC', 'M31', 'M33'], 25: ['spiral', 'edge', 'elliptical'] };
  let gal = null, galBase = null, galInfo = null;
  function buildGalaxies() {
    const r = rng(404); const web = sampleWeb([0, 0, 0], 340, 72000, r, { thick: 3.2, clump: 0.6 }); const keep = [];
    const stops = [22, 23, 24, 25].map((s) => toM(P[s])); const trioC = toM(W.trioC);
    for (let i = 0; i < web.n; i++) { const p = [web.pos[i * 3], web.pos[i * 3 + 1], web.pos[i * 3 + 2]];
      if (len(p) < 4.5) continue; if (stops.some((s) => len(sub(p, s)) < 4.2)) continue; if (len(sub(p, trioC)) < 9) continue; keep.push(p); }
    const rd = rng(88); for (let i = 0; i < 26; i++) keep.push(add(toM(W.galC), mul(rd.ball(), 2.6)));       // Local Group dwarfs
    const n = keep.length + special.length; const pos = new Float32Array(n * 3), lum = new Float32Array(n), diam = new Float32Array(n), kind = new Float32Array(n), seed = new Float32Array(n), nrm = new Float32Array(n * 3), col = new Float32Array(n * 3);
    keep.forEach((p, i) => { const dwarf = i >= keep.length - 26; const k = r(); const kd = dwarf ? 2 : k < 0.62 ? 0 : k < 0.9 ? 1 : 2; pos.set(p, i * 3); kind[i] = kd; seed[i] = r() * 6.28; nrm.set(r.sphere(), i * 3);
      const big = Math.pow(r(), 2.2); diam[i] = dwarf ? 0.004 + r() * 0.008 : 0.02 + big * 0.14; lum[i] = dwarf ? 0.35 : 0.5 + big * 1.1; col.set(kd === 1 ? [1.0, 0.84, 0.62] : kd === 2 ? [0.75, 0.85, 1.0] : [0.86 + r() * 0.14, 0.88, 0.92 + r() * 0.08], i * 3); });
    special.forEach((s, j) => { const i = keep.length + j; pos.set(s.p, i * 3); kind[i] = s.kind; seed[i] = j * 1.7; nrm.set(s.nrm, i * 3); diam[i] = s.diam; lum[i] = s.lum; col.set(s.kind === 1 ? [1.0, 0.84, 0.62] : [0.9, 0.92, 1.0], i * 3); });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('lum', new THREE.BufferAttribute(lum, 1)); g.setAttribute('diam', new THREE.BufferAttribute(diam, 1)); g.setAttribute('kind', new THREE.BufferAttribute(kind, 1)); g.setAttribute('seed', new THREE.BufferAttribute(seed, 1)); g.setAttribute('nrm', new THREE.BufferAttribute(nrm, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    gal = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: { camP: { value: new THREE.Vector3() }, gain: { value: 1 }, px: { value: PX }, pxPerRad: { value: 1080 / (48 * DEG) } }, vertexShader: GAL_VS, fragmentShader: GAL_FS, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); gal.frustumCulled = false; gal.renderOrder = 1; dyn.add(gal);
    galBase = lum.slice(); galInfo = { first: keep.length };
    // map dots sit on the same galaxies
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', g.attributes.position); dots.A = mkDots(dg, 340);
  }
  // ---------- map layer ----------
  const dots = { A: null, B: null, C: null, Bkey: -1 };
  function mkDots(g, range) { const m = new THREE.ShaderMaterial({ uniforms: { camP: { value: new THREE.Vector3() }, px: { value: PX }, reveal: { value: 1e9 }, range: { value: range }, sizeK: { value: 300 }, alphaK: { value: 1 }, tint: { value: new THREE.Color(0.62, 0.86, 1.0) } }, vertexShader: DOT_VS, fragmentShader: DOT_FS, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }); const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = 4; p.visible = false; dyn.add(p); return p; }
  function buildWeb(stop) {
    if (dots.Bkey === stop) return; dots.Bkey = stop; for (const k of ['B', 'C']) if (dots[k]) { dyn.remove(dots[k]); dots[k].geometry.dispose(); dots[k] = null; }
    const c = toM(P[stop]); const r = rng(1000 + stop);
    const wb = sampleWeb(c, 1350, 230000, r, { thick: 4.5, clump: 0.35, fVoid: 0.04, fWall: 0.2 }); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(wb.pos, 3)); dots.B = mkDots(g, 1350); dots.B.userData.c = c;
    if (stop >= 26) { const wc = sampleWeb(c, 7500, 260000, r, { thick: 12, clump: 0, fVoid: 0.1, fWall: 0.3 }); const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.BufferAttribute(wc.pos, 3)); dots.C = mkDots(g2, 7500); dots.C.userData.c = c; }
  }

  const unitOf = (stop) => [1, 1, 10, 100, 1000][stop - 6] ?? 1;        // km per scene unit, so baked depth stays in half-float range
  let prepared = -1;
  const sunGlare = { 6: [1.5, 1], 7: [1.5, 1], 8: [1.5, 1], 9: [1.5, 1], 10: [1.5, 1], 11: [1.5, 1], 12: [1.4, 1], 13: [0.62, 0.85], 14: [0.2, 0.6], 15: [0.055, 0.45] };
  const visTo = (dir, target, cam, half, soft) => { const a = angleBetween(dir, sub(target, cam)); return 1 - sstep(half, half + soft, a); };
  return {
    name: 'space', hasStatic: (stop) => stop <= 10, isLive: () => false, pos: () => [0, 0, 0],
    range(stop) { const u = unitOf(stop); const dE = len(sub(W.earthC, P[stop])) / KM - 6371; return [Math.max(dE * 0.4, 4) / u, 59000]; },
    async prepare(stop) {
      if (!ready) ready = init(); await ready;
      if (prepared === stop) return; prepared = stop;
      await loadSky(BAKE_OF(stop));
      if (stop === 20 && !cats.B) cats.B = catalogue(P[20], 520, 150000, 21, [], 0);
      if (stop === 21 && !cats.C) cats.C = catalogue(P[21], 3000, 9000, 22);
      if (stop >= 21 && !gal) buildGalaxies();
      if (stop >= 25) buildWeb(stop);
      setBodies(stop);
      if (gal) { const l = gal.geometry.attributes.lum; l.array.set(galBase); (HIDE[stop] || []).forEach((id) => { const j = special.findIndex((s) => s.id === id); l.array[galInfo.first + j] = 0; }); if (stop <= 23) for (let i = galInfo.first - 26; i < galInfo.first; i++) l.array[i] *= 1; l.needsUpdate = true; }
    },
    // [exposure, star gain]: stars dim while the lit Earth or the Sun is in view, and come back as the eye adapts
    adapt(t, stop, dir) {
      const cam = P[stop]; let g = 1;
      if (stop <= 10) { const dE = len(sub(W.earthC, cam)); const rho = Math.asin(Math.min(1, 6371e3 / dE)) / DEG; g *= lerp(1, stop <= 8 ? 0.10 : stop === 9 ? 0.3 : 0.7, visTo(dir, W.earthC, cam, rho + 8, 30)); }
      if (stop <= 14) g *= lerp(1, stop <= 12 ? 0.08 : stop === 13 ? 0.3 : 0.7, visTo(dir, W.sun, cam, 22, 30));
      return [1, g];
    },
    renderStatic(renderer, rt, cam, stop) {
      const u = unitOf(stop), c = P[stop]; const rel = (p) => mul(sub(p, c), 1 / (KM * u));
      const eC = rel(W.earthC); earth.matrix.copy(ecef2enu).scale(new THREE.Vector3(1 / u, 1 / u, 1 / u)).setPosition(eC[0], eC[1], eC[2]); earth.matrix.premultiply(new THREE.Matrix4()); earth.matrixWorldNeedsUpdate = true;
      { const m = new THREE.Matrix4().makeScale(1 / u, 1 / u, 1 / u); m.multiply(ecef2enu); m.setPosition(eC[0], eC[1], eC[2]); earth.matrix.copy(m); atmo.matrix.copy(m); atmo.matrixWorldNeedsUpdate = true; }
      eU.camW.value.set(0, 0, 0); aU.cW.value.set(...eC); aU.R.value = 6371 / u; aU.H.value = 20 / u; eU.detail.value = stop <= 6 ? 1 : stop === 7 ? 0.4 : 0;
      let mC = rel(W.moon), ms = 1 / u; const dm = len(mC); if (dm > 40000) { ms *= 40000 / dm; mC = mul(mC, 40000 / dm); } moon.position.set(...mC); moon.scale.setScalar(ms);
      renderer.setRenderTarget(rt); renderer.setClearColor(0, 1); renderer.clear(); renderer.render(stat, cam);
    },
    setCamera(camera, c) { camera.position.set(0, 0, 0); const [n] = this.range(c.stop); camera.near = c.stop <= 10 ? n : 0.1; camera.far = 60000; camera.updateProjectionMatrix(); camera.updateMatrixWorld(); },
    renderDynamic(renderer, rt, camera, c) {
      const { t, stop, gain } = c; const cam = P[stop];
      for (const m of skyMats) m.uniforms.gain.value = ({ 20: 1.3, 21: 1.6, 22: 2.6, 23: 2.6, 25: 1.15 }[stop] ?? 0.9) * gain;
      // stars
      for (const k in cats) if (cats[k]) cats[k].pts.visible = false;
      const cat = stop <= 19 ? cats.A : stop === 20 ? cats.B : stop === 21 ? cats.C : null;
      if (cat) { cat.pts.visible = true; const u = cat.pts.material.uniforms; const q = lyRel(cam, cat.centre); u.camP.value.set(...q); u.gain.value = gain * (stop === 21 ? 0.6 : 1); }
      bodies.visible = stop <= 12; bodies.material.uniforms.gain.value = Math.max(gain, 0.35);
      // sun
      const sg = sunGlare[stop]; sunSpr.visible = sunCore.visible = !!sg;
      if (sg) { const d = norm(sub(W.sun, cam)); const D = 30000; sunSpr.position.set(d[0] * D, d[1] * D, d[2] * D); sunSpr.scale.setScalar(D * sg[0]); sunSpr.material.opacity = sg[1]; sunCore.position.copy(sunSpr.position); sunCore.scale.setScalar(D * Math.max(0.012, sg[0] * 0.035)); }
      // galaxies + map
      if (gal) { gal.visible = stop >= 21 && stop <= 25; const q = toM(cam); gal.material.uniforms.camP.value.set(...q); gal.material.uniforms.gain.value = stop === 21 ? 0.6 : stop === 22 ? 1.1 : stop === 25 ? 1.2 : 1.7; }
      const mapOn = stop >= 26 ? 1 : stop === 25 ? sstep(575.0, 576.2, t) : 0;
      if (dots.A) { dots.A.visible = stop === 25 && mapOn > 0; const u = dots.A.material.uniforms; u.camP.value.set(...toM(cam)); u.alphaK.value = mapOn; u.reveal.value = 1e9; u.sizeK.value = 600; }
      if (dots.B) { dots.B.visible = mapOn > 0; const u = dots.B.material.uniforms; u.camP.value.set(0, 0, 0); u.alphaK.value = 0.95 * mapOn; u.reveal.value = stop === 25 ? lerp(30, 1500, Math.pow(sstep(575.3, 579.2, t), 1.6)) : 1e9; u.sizeK.value = 700; }
      if (dots.C) { dots.C.visible = true; const u = dots.C.material.uniforms; u.camP.value.set(0, 0, 0); u.alphaK.value = stop === 26 ? 0.10 : 0.16; u.sizeK.value = 2200; u.reveal.value = 1e9; u.tint.value.setRGB(0.5, 0.7, 0.95); }
      renderer.setRenderTarget(rt); const ac = renderer.autoClear; renderer.autoClear = false; renderer.render(dyn, camera); renderer.autoClear = ac;
      const near = stop <= 12; const eDir = norm(sub(W.earthC, cam));
      return { bloom: stop <= 15 ? 0.55 : 0.4, threshold: 0.75, radius: 0.7, vig: 0.3, grain: 0.022,
        hand: { key: stop <= 12 ? 3.2 : stop === 13 ? 1.2 : stop === 14 ? 0.4 : 0.12, amb: stop <= 8 ? 0.35 : stop <= 12 ? 0.16 : 0.13, fill: stop <= 8 ? 0.5 : 0.08, fillColor: new THREE.Color(0.5, 0.7, 1.0), sky: new THREE.Color(0.6, 0.7, 1.0), ground: new THREE.Color(0.3, 0.35, 0.5), color: new THREE.Color(1.0, 0.96, 0.9), worldDir: W.sunDir } };
    },
  };
}
