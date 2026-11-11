import * as THREE from 'three';
import { Builder } from './builder.js';
import * as TX from './textures.js';
import { rng, fbm2, clamp, sstep, lerp, DEG, hash3 } from './util.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ---------------- geography of the fictional hillside (metres, home at origin) ----------------
const softplus = (v, k) => k * Math.log(1 + Math.exp(v / k));
export const coastX = (y) => 420 + 0.35 * y - 0.9 * softplus(-600 - y, 80);
const asiaX = (y) => 1750 + 0.2 * y + 120 * Math.sin(y / 600);
export function ground(x, y) {
  let h = -4;
  const d1 = coastX(y) - x; if (d1 > 0) h = d1 < 25 ? 2.2 : d1 < 545 ? 2.2 + 0.115 * (d1 - 25) : 62 + 40 * (1 - Math.exp(-(d1 - 545) / 350));
  const d2 = x - asiaX(y); if (d2 > 0) h = Math.max(h, d2 < 20 ? 2 : 2 + Math.min(0.085 * (d2 - 20), 70) + 55 * sstep(700, 2600, d2) * (0.7 + 0.6 * fbm2(x / 900, y / 900, 3, 4)));
  const d3 = Math.min(-1750 + 0.15 * x - y, (700 - x) * 0.8); if (d3 > 0) h = Math.max(h, d3 < 20 ? 2 : 2 + Math.min(0.09 * (d3 - 20), 44));
  return h;
}

export const SKY_GLSL = `
vec3 skyColor(vec3 d, vec3 sun){
  float mu = max(dot(d, sun), 0.0); float z = max(d.z, 0.0);
  vec3 zen = vec3(0.07, 0.20, 0.56), hor = vec3(0.50, 0.63, 0.80);
  vec3 c = mix(hor, zen, pow(z, 0.42));
  vec3 warm = vec3(1.25, 0.92, 0.62);
  c = mix(c, warm, pow(mu, 5.0) * 0.55 * (1.0 - 0.75*z));
  c += vec3(1.0, 0.86, 0.66) * (pow(mu, 60.0) * 0.6 + pow(mu, 900.0) * 4.0);
  c += vec3(1.0, 0.93, 0.8) * smoothstep(0.99996, 0.99999, mu) * 40.0;
  if (d.z < 0.0) c = mix(c, vec3(0.50, 0.60, 0.72), clamp(-d.z * 6.0, 0.0, 1.0));
  return c * 1.05;
}`;
const NOISE_GLSL = `
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }`;

export function makeSky(sunV) {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(20000, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { sun: { value: sunV } },
    vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `varying vec3 vD; uniform vec3 sun; ${SKY_GLSL} ${NOISE_GLSL}
      void main(){ vec3 d = normalize(vD); vec3 c = skyColor(d, sun);
        vec2 q = d.xy/max(d.z+0.12, 0.05); float cl = vn(q*vec2(1.2,3.5)+3.0)*0.6 + vn(q*vec2(3.0,8.0))*0.4; cl = smoothstep(0.55, 0.9, cl)*smoothstep(0.0,0.12,d.z)*(1.0-smoothstep(0.3,0.7,d.z));
        c = mix(c, vec3(1.25,1.12,0.98)*(0.8+0.8*pow(max(dot(d,sun),0.0),3.0)), cl*0.45);
        gl_FragColor = vec4(c, 1.0); }`,
  })); sky.renderOrder = -10; sky.frustumCulled = false; return sky;
}

export const PAL = [[0.93, 0.87, 0.72], [0.91, 0.82, 0.64], [0.88, 0.76, 0.56], [0.86, 0.72, 0.58], [0.92, 0.86, 0.76], [0.95, 0.93, 0.86], [0.84, 0.75, 0.64], [0.80, 0.72, 0.62], [0.89, 0.71, 0.60], [0.80, 0.84, 0.82], [0.84, 0.62, 0.50], [0.90, 0.80, 0.50]];

export function buildIstanbul(tl) {
  const W = tl.W, P = tl.P, r = rng(20261);
  const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x9fb4cc, 0.00052);
  const dyn = new THREE.Scene(); dyn.fog = scene.fog;
  const sunV = new THREE.Vector3(...W.sunDir);
  const pbr = (o) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, ...o });
  const std = (o) => { const { roughness, metalness, ...r2 } = o; return new THREE.MeshLambertMaterial({ vertexColors: true, ...r2 }); };
  const mats = {
    default: std({}), plain: std({}), stone: std({ map: TX.concreteTex(5), roughness: 1 }),
    f0: std({ map: TX.facadeTex(0, 11) }), f1: std({ map: TX.facadeTex(1, 12) }), f2: std({ map: TX.facadeTex(2, 13) }), f3: std({ map: TX.facadeTex(3, 14) }), f4: std({ map: TX.facadeTex(4, 15) }), f5: std({ map: TX.facadeTex(0, 16) }),
    roof: std({ map: TX.roofTex(3), roughness: 0.85 }), tile: std({ map: TX.tileFloorTex(4) }), concrete: std({ map: TX.concreteTex(6) }), cobble: std({ map: TX.cobbleTex(7), roughness: 0.8 }), roofing: std({ map: TX.roofingTex(31), roughness: 1 }),
    parquet: pbr({ map: TX.parquetTex(8), roughness: 0.42 }), fabric: std({ map: TX.fabricTex(9), roughness: 1 }), kilim: std({ map: TX.kilimTex(10), roughness: 1 }), wood: std({ map: TX.woodTex(2), roughness: 0.55 }),
    iron: std({ map: TX.ironTex(1), roughness: 0.7, metalness: 0.2 }), wallInt: std({ map: TX.plasterTex(21), roughness: 1 }), brass: pbr({ roughness: 0.35, metalness: 0.0 }), paint: pbr({ roughness: 0.5 }),
    glass: new THREE.MeshStandardMaterial({ color: 0xbfd6e0, transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.3, depthWrite: false }),
    pic0: std({ map: TX.picTex(1) }), pic1: std({ map: TX.picTex(2) }), pic2: std({ map: TX.picTex(3) }),
    emis: new THREE.MeshBasicMaterial({ vertexColors: true }),
  };
  const B = new Builder(160);

  // ---------------- terrain ----------------
  {
    const X0 = -1100, X1 = 5200, Y0 = -3600, Y1 = 2400, NX = 210, NY = 200;
    const g = new THREE.PlaneGeometry(X1 - X0, Y1 - Y0, NX, NY); const p = g.attributes.position; const col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + (X0 + X1) / 2, y = p.getY(i) + (Y0 + Y1) / 2; const h = ground(x, y); p.setXYZ(i, x, y, h - 0.3);
      const n = fbm2(x / 60, y / 60, 3, 2); const gr = h < 3 ? [0.50, 0.49, 0.46] : [lerp(0.30, 0.42, n), lerp(0.36, 0.40, n), lerp(0.22, 0.30, n)];
      col.set(gr, i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, std({})); m.receiveShadow = true; scene.add(m);
  }

  // ---------------- heroes ----------------
  const home = { x0: -6, x1: 1.8, y0: -5.6, y1: 5.4 };
  const P2 = P[2], P3 = P[3], P4 = P[4];
  const heroes = [
    home,
    { x0: 7.8, x1: 15.6, y0: -4.6, y1: 5.6 },
    { x0: 16, x1: 23.8, y0: 93, y1: 106 },
    { x0: -6, x1: 15.6, y0: 108, y1: 119.5 },
    { x0: P4[0] - 9, x1: P4[0] + 9, y0: P4[1] - 10.5, y1: P4[1] + 8.5 },
  ];
  const hits = (a) => heroes.some((h) => a.x0 < h.x1 + 0.3 && a.x1 > h.x0 - 0.3 && a.y0 < h.y1 + 0.2 && a.y1 > h.y0 - 0.2);

  function roofGable(x0, x1, y0, y1, zt, col = [1, 1, 1]) {
    const o = 0.35, xm = (x0 + x1) / 2, rh = 0.4 * (x1 - x0) / 2, sl = Math.hypot(xm - x0 + o, rh) / 2.4, w = (y1 - y0 + 2 * o) / 2.4;
    B.quad('roof', [x0 - o, y1 + o, zt - 0.12], [x0 - o, y0 - o, zt - 0.12], [xm, y0 - o, zt + rh], [xm, y1 + o, zt + rh], [0, 0, w, sl], col);
    B.quad('roof', [x1 + o, y0 - o, zt - 0.12], [x1 + o, y1 + o, zt - 0.12], [xm, y1 + o, zt + rh], [xm, y0 - o, zt + rh], [0, 0, w, sl], col);
    return rh;
  }
  function parapet(x0, x1, y0, y1, z, hgt, col, t = 0.22) {
    B.box('concrete', x0, x1, y0, y0 + t, z, z + hgt, col, 3); B.box('concrete', x0, x1, y1 - t, y1, z, z + hgt, col, 3);
    B.box('concrete', x0, x0 + t, y0 + t, y1 - t, z, z + hgt, col, 3); B.box('concrete', x1 - t, x1, y0 + t, y1 - t, z, z + hgt, col, 3);
  }
  // generic building. o: {floors|top, style, tint, flat, near, ns}
  function building(L, o) {
    const { x0, x1, y0, y1 } = L; const yc = (y0 + y1) / 2;
    const gW = ground(x0, yc), gE = ground(x1, yc); const zb = o.zb ?? (Math.max(gW, gE) + 0.5);
    const zt = o.top ?? zb + 3 * o.floors; const fl = (zt - zb) / 3; const tint = o.tint;
    const nb = Math.max(1, Math.round((y1 - y0) / 3.3)), nd = Math.max(1, Math.round((x1 - x0) / 3.3));
    const dk = [tint[0] * 0.62, tint[1] * 0.6, tint[2] * 0.58];
    if (o.near) B.box('stone', x0 - 0.05, x1 + 0.05, y0, y1, Math.min(gW, gE) - 3, zb, dk, 3, 'Zz');
    const zlow = o.near ? zb : Math.min(gW, gE) - 2, fb = (zb - zlow) / 3;
    const fs = 'f' + o.style, fn = fs; o = { ...o, ns: true, ew: !o.ns };
    B.wall(fs, x1, y0, x1, y1, zlow, zt, [0, -fb, nb, fl], tint);
    B.wall(fs, x0, y1, x0, y0, zlow, zt, [0, -fb, nb, fl], tint);
    B.wall(fn, x1, y1, x0, y1, zlow, zt, o.ns ? [0, -fb, nd, fl] : [0, 0, (x1 - x0) / 6, (zt - zlow) / 6], o.ns ? tint : [tint[0] * 0.93, tint[1] * 0.92, tint[2] * 0.9]);
    B.wall(fn, x0, y0, x1, y0, zlow, zt, o.ns ? [0, -fb, nd, fl] : [0, 0, (x1 - x0) / 6, (zt - zlow) / 6], o.ns ? tint : [tint[0] * 0.93, tint[1] * 0.92, tint[2] * 0.9]);
    if (o.flat) {
      B.quad(o.floorMat || 'roofing', [x0, y0, zt], [x1, y0, zt], [x1, y1, zt], [x0, y1, zt], [0, 0, (x1 - x0) / 2.4, (y1 - y0) / 2.4], o.floorCol || [0.62, 0.6, 0.58]);
      if (o.near) parapet(x0, x1, y0, y1, zt, 0.95, [tint[0] * 0.95, tint[1] * 0.95, tint[2] * 0.95]);
      else { B.wall('f4', x1, y0, x1, y1, zt, zt + 0.9, [0, 0, 2, 0.15], tint); B.wall('f4', x0, y1, x0, y0, zt, zt + 0.9, [0, 0, 2, 0.15], tint); B.wall('f4', x1, y1, x0, y1, zt, zt + 0.9, [0, 0, 1, 0.15], tint); B.wall('f4', x0, y0, x1, y0, zt, zt + 0.9, [0, 0, 1, 0.15], tint); }
      if (o.props !== false && L.h1 < 0.45) { const tx = lerp(x0 + 1.2, x1 - 2.2, L.h2), ty = lerp(y0 + 1.2, y1 - 2.2, L.h1 * 2); B.box('plain', tx, tx + 1.1, ty, ty + 1.1, zt + 0.5, zt + 1.7, [0.75, 0.77, 0.8]); B.box('plain', tx + 0.1, tx + 1.0, ty + 0.1, ty + 1.0, zt, zt + 0.5, [0.3, 0.3, 0.32]); }
    } else {
      const sh = 0.82 + 0.3 * L.h2; const rh = roofGable(x0, x1, y0, y1, zt, [sh, sh, sh]); const xm = (x0 + x1) / 2;
      B.tri('f4', [x0, y0, zt], [x1, y0, zt], [xm, y0, zt + rh], tint, [0, 0, 1, 0, 0.5, 0.3]); B.tri('f4', [x1, y1, zt], [x0, y1, zt], [xm, y1, zt + rh], tint, [0, 0, 1, 0, 0.5, 0.3]);
      if (L.h1 < 0.7) { const cy = lerp(y0 + 1, y1 - 1.6, L.h1), cx = xm + (L.h2 - 0.5) * 3; B.box('f4', cx, cx + 0.55, cy, cy + 0.7, zt, zt + rh + 0.8, [tint[0] * 0.8, tint[1] * 0.78, tint[2] * 0.76], 6, 'z'); }
    }
    return { zb, zt };
  }
  // iron balcony on an east (dir=+1) or west (dir=-1) facade
  function balcony(xf, dir, y0, y1, z, o = {}) {
    const dep = o.dep ?? 1.2, xo = xf + dir * dep, xa = Math.min(xf, xo), xb = Math.max(xf, xo), tint = o.tint || [1, 1, 1];
    B.box('concrete', xa, xb, y0, y1, z - 0.16, z, [0.9, 0.88, 0.84], 2);
    for (const yy of [y0 + 0.35, y1 - 0.5]) B.box('concrete', xa + 0.05, xb - 0.25, yy, yy + 0.14, z - 0.5, z - 0.16, [0.85, 0.83, 0.8], 2);
    const xr = xo - dir * 0.03, hgt = 1.0, t = 0.016;
    const bar = (xA, xB, yA, yB, zA, zB) => B.box('iron', Math.min(xA, xB), Math.max(xA, xB), yA, yB, zA, zB, tint, 0.35);
    bar(xr - 0.03, xr + 0.03, y0, y1, z + hgt - 0.02, z + hgt + 0.03); bar(xr - 0.02, xr + 0.02, y0, y1, z + 0.08, z + 0.11); bar(xr - 0.012, xr + 0.012, y0, y1, z + hgt - 0.2, z + hgt - 0.18);
    for (let y = y0 + 0.02; y <= y1 - 0.01; y += 0.115) bar(xr - t / 2, xr + t / 2, y - t / 2, y + t / 2, z + 0.08, z + hgt);
    for (const ys of [y0, y1]) { bar(xf, xr, ys - 0.02, ys + 0.02, z + hgt - 0.02, z + hgt + 0.03); bar(xf, xr, ys - 0.012, ys + 0.012, z + 0.08, z + 0.11); for (let x = Math.min(xf, xr) + 0.1; x < Math.max(xf, xr); x += 0.115) bar(x - t / 2, x + t / 2, ys - t / 2, ys + t / 2, z + 0.08, z + hgt); }
    if (o.pots) for (const py of o.pots) { B.cyl('plain', xr - dir * 0.22, py, z, z + 0.22, 0.11, 0.14, [0.66, 0.36, 0.25], 10); B.dome('plain', xr - dir * 0.22, py, z + 0.2, 0.2, [0.22, 0.42, 0.2], 8, 3, 1.1); }
  }

  // ---------------- procedural lots ----------------
  const lots = [];
  const nearPts = [[0, 0], [P3[0], P3[1]], [P4[0], P4[1]]];
  for (let k = -17; k <= 21; k++) for (const row of [0, 1]) {
    const x0 = 7.8 + 22 * k + row * 8.2, x1 = x0 + 7.8; let y = -1260 + r() * 6;
    while (y < 1180) {
      const w = 7 + r() * 6, L = { x0, x1, y0: y, y1: y + w - 0.02, h1: r(), h2: r(), h3: r(), k, row }; y += w + (r() < 0.07 ? 3 + r() * 8 : 0);
      const yc = (L.y0 + L.y1) / 2; if (coastX(yc) - x1 < 16) continue; if (hits(L)) continue;
      if (Math.abs(((yc + 45) % 90 + 90) % 90 - 45) > 41.5 && !(k === 0 || k === -1) ) continue;        // cross streets (stairs)
      if (k === -1 && row === 1 || k === 0 && row === 0) { if (yc > 106 || yc < -150) { if (yc < 125 && yc > 106) continue; } }
      lots.push(L);
    }
  }
  const trees = [];
  for (const L of lots) {
    const yc = (L.y0 + L.y1) / 2, xc = (L.x0 + L.x1) / 2, dC = coastX(yc) - xc;
    if (L.h3 < 0.045) { trees.push([xc, yc, L.h1 < 0.5 ? 0 : 1, 0.8 + L.h2 * 0.6]); continue; }
    let floors = 3 + Math.floor(fbm2(xc / 120, yc / 120, 2, 9) * 2.6 + L.h1 * 1.6);
    if (dC < 90) floors = Math.min(floors, 2 + Math.floor(L.h1 * 3));
    if (L.k === 0 && yc > -80 && yc < 93) floors = Math.min(floors, 3 + (L.h1 < 0.5 ? 1 : 0));
    if (L.k === -1 && L.row === 1 && Math.abs(yc) < 40) floors = Math.max(4, Math.min(floors, 5));
    const d4 = Math.hypot(xc - P4[0], yc - P4[1]); if (d4 < 80 && yc > P4[1] - 14) { floors = Math.floor((P4[2] - 2.6 - ground(L.x0, yc) - 0.5) / 3); if (floors < 1) { trees.push([xc, yc, 1, 0.8]); continue; } }
    const near = nearPts.some((q) => Math.hypot(xc - q[0], yc - q[1]) < 130) || (Math.abs(xc - 5) < 30 && yc > -20 && yc < 120);
    const flat = L.h2 < (dC < 120 ? 0.5 : 0.28);
    const o = { floors, style: L.h3 < 0.4 ? 0 : L.h3 < 0.7 ? 1 : L.h3 < 0.9 ? 2 : 5, tint: PAL[Math.floor(L.h1 * 977) % PAL.length], flat, near, floorMat: L.h1 < 0.5 ? 'tile' : 'roofing', floorCol: L.h1 < 0.5 ? [0.85, 0.8, 0.75] : [0.6, 0.6, 0.6] };
    const { zb, zt } = building(L, o);
    // real balconies along the home street
    if (near && Math.abs(yc) < 60 && L.k === -1 && L.row === 1) { const tint = [[1, 1, 1], [0.5, 0.55, 0.8], [0.9, 0.9, 0.85], [0.35, 0.35, 0.35]][Math.floor(L.h2 * 4)]; for (let f = 1; f < floors; f++) if (hash3(f, L.y0 | 0, 3) < 0.75) balcony(L.x1, 1, L.y0 + 1.2, L.y1 - 1.2, zb + 3 * f, { tint, dep: 1.0, pots: hash3(f, L.y0 | 0, 5) < 0.5 ? [L.y0 + 1.6] : null }); }
  }
  // far shores: simple blocks
  const far = rng(77);
  for (let i = 0; i < 3000; i++) {
    const asia = i < 2000; let x, y;
    if (asia) { y = -2600 + far() * 4600; x = asiaX(y) + 22 + far() * far() * 1900; } else { x = -900 + far() * 1560; y = -1790 + 0.15 * x - far() * far() * 900; if ((700 - x) * 0.8 < 25) continue; }
    x = Math.round(x / 14) * 14; y = Math.round(y / 13) * 13;
    const L = { x0: x, x1: x + 9 + far() * 3, y0: y, y1: y + 9 + far() * 3, h1: far(), h2: far(), h3: 0 };
    if (ground(x, y) < 1.9) continue;
    building(L, { floors: 2 + Math.floor(far() * 4), style: far() < 0.5 ? 0 : 5, tint: PAL[Math.floor(far() * PAL.length)], flat: far() < 0.3, near: false, props: false });
    if (far() < 0.08) trees.push([x - 5, y - 4, far() < 0.6 ? 0 : 1, 1 + far() * 0.5]);
  }
  for (let i = 0; i < 500; i++) { const y = -1200 + r() * 2300, x = coastX(y) - 30 - r() * 700; if (!lots.some((L) => x > L.x0 - 1 && x < L.x1 + 1 && y > L.y0 - 1 && y < L.y1 + 1) && !hits({ x0: x - 2, x1: x + 2, y0: y - 2, y1: y + 2 }) && !(x > 0 && x < 9.5 && y > -160 && y < 108)) trees.push([x, y, r() < 0.5 ? 0 : 1, 0.7 + r() * 0.6]); }

  // ---------------- landmarks ----------------
  function mosque(cx, cy, s, minarets = 2) {
    const g = ground(cx, cy), w = [0.86, 0.84, 0.78], lead = [0.50, 0.54, 0.58];
    B.box('plain', cx - 9 * s, cx + 9 * s, cy - 9 * s, cy + 9 * s, g - 3, g + 9 * s, w);
    B.cyl('plain', cx, cy, g + 9 * s, g + 11.5 * s, 8.4 * s, 8.4 * s, w, 20); B.dome('plain', cx, cy, g + 11.5 * s, 8.2 * s, lead, 20, 7, 0.82);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) B.dome('plain', cx + dx * 9 * s, cy + dy * 9 * s, g + 6.5 * s, 5.2 * s, lead, 12, 5, 0.9);
    const ms = [[1, 1], [-1, -1], [1, -1], [-1, 1]].slice(0, minarets);
    for (const [dx, dy] of ms) { const mx = cx + dx * 11.5 * s, my = cy + dy * 11.5 * s; B.cyl('plain', mx, my, g, g + 30 * s, 1.0 * s, 0.85 * s, w, 10); B.cyl('plain', mx, my, g + 19 * s, g + 20 * s, 1.6 * s, 1.6 * s, w, 10); B.cyl('plain', mx, my, g + 30 * s, g + 36.5 * s, 1.05 * s, 0, lead, 10); }
  }
  mosque(-96, 236, 0.9, 1); mosque(-420, -2030, 2.6, 4); mosque(40, -2090, 2.2, 4); mosque(-860, -1990, 2.0, 2); mosque(2260, 420, 1.6, 2); mosque(2050, -900, 1.3, 2); mosque(-232, -418, 0.8, 1);
  { const tx = -262, ty = -612, g = ground(tx, ty); B.cyl('stone', tx, ty, g - 4, g + 44, 8.2, 7.8, [0.72, 0.68, 0.6], 20); B.cyl('stone', tx, ty, g + 44, g + 46, 9, 9, [0.66, 0.62, 0.56], 20); B.cyl('stone', tx, ty, g + 46, g + 52, 7, 7, [0.7, 0.66, 0.6], 20); B.cyl('plain', tx, ty, g + 52, g + 66, 7.8, 0, [0.42, 0.46, 0.5], 20); }

  // ---------------- street by the house ----------------
  B.quad('cobble', [1.8, -160, 47.0], [7.8, -160, 46.5], [7.8, 108, 46.9], [1.8, 108, 47.5], [0, 0, 3, 134], [1, 1, 1]);
  for (let y = -150; y < 105; y += 10) { B.quad('cobble', [1.8, y, ground(1.8, y) + 0.05], [7.8, y, ground(7.8, y) + 0.05], [7.8, y + 10, ground(7.8, y + 10) + 0.05], [1.8, y + 10, ground(1.8, y + 10) + 0.05], [0, 0, 3, 5]); }

  // ---------------- home building ----------------
  const HT = PAL[0], zF = 61.0, zC = 63.9;
  {
    const { x0, x1, y0, y1 } = home, zb = 49.0, zt = 64.0;
    B.box('stone', x0, x1, y0, y1, 43, zb, [0.6, 0.57, 0.52], 3, 'Zz');
    // east facade: textured below the salon floor, real geometry on the salon floor
    B.wall('f2', x1, y0, x1, y1, zb, zF, [0, 0, 3, 4], HT);
    B.wall('f0', x1, y0, x1, -2.4, zF, zt, [0, 0, 0.9, 1], HT); B.wall('f0', x1, 2.2, x1, y1, zF, zt, [0.05, 0, 0.95, 1], HT);
    B.wall('f1', x0, y1, x0, y0, zb, zt, [0, 0, 3, 5], HT);
    B.wall('f4', x1, y1, x0, y1, 44, zt, [0, 0, 1.3, 3.3], HT); B.wall('f4', x0, y0, x1, y0, 44, zt, [0, 0, 1.3, 3.3], HT);
    const rh = roofGable(x0, x1, y0, y1, zt), xm = (x0 + x1) / 2;
    B.tri('f4', [x0, y0, zt], [x1, y0, zt], [xm, y0, zt + rh], HT); B.tri('f4', [x1, y1, zt], [x0, y1, zt], [xm, y1, zt + rh], HT);
    B.box('f4', -3.2, -2.6, 3.2, 4.0, zt, zt + rh + 1, [0.7, 0.66, 0.6], 6, 'z');
    for (const z of [52, 55, 58]) balcony(x1, 1, -1.5, 1.75, z, { pots: z === 55 ? [-1.1, 1.3] : z === 58 ? [0.9] : null, tint: [1, 1, 1] });
    balcony(x1, 1, -1.5, 1.75, zF, { pots: [-1.15] });
    // salon east wall with door + window openings (outer x=1.8, inner x=1.5)
    const holes = [{ y0: 0.0, y1: 1.4, z0: zF, z1: 63.25 }, { y0: -1.9, y1: -0.8, z0: 61.9, z1: 63.3 }];
    const ys = [-2.4, -1.9, -0.8, 0.0, 1.4, 2.2], zs = [zF, 61.9, 63.25, 63.3, zt];
    for (let i = 0; i < ys.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
      const ym = (ys[i] + ys[i + 1]) / 2, zm = (zs[j] + zs[j + 1]) / 2; if (holes.some((h) => ym > h.y0 && ym < h.y1 && zm > h.z0 && zm < h.z1)) continue;
      B.wall('f4', 1.8, ys[i], 1.8, ys[i + 1], zs[j], zs[j + 1], [ys[i] / 6, zs[j] / 6, ys[i + 1] / 6, zs[j + 1] / 6], [HT[0] * 1.02, HT[1] * 1.02, HT[2] * 1.02]);
      if (zs[j] < zC) B.wall('wallInt', 1.5, ys[i + 1], 1.5, ys[i], zs[j], Math.min(zs[j + 1], zC), [0, 0, 1, 1], [0.95, 0.92, 0.86]);
    }
    for (const h of holes) { // reveals
      B.quad('wallInt', [1.5, h.y0, h.z0], [1.8, h.y0, h.z0], [1.8, h.y0, h.z1], [1.5, h.y0, h.z1], [0, 0, 0.1, 1], [0.93, 0.9, 0.85]);
      B.quad('wallInt', [1.8, h.y1, h.z0], [1.5, h.y1, h.z0], [1.5, h.y1, h.z1], [1.8, h.y1, h.z1], [0, 0, 0.1, 1], [0.93, 0.9, 0.85]);
      B.quad('wallInt', [1.5, h.y1, h.z1], [1.5, h.y0, h.z1], [1.8, h.y0, h.z1], [1.8, h.y1, h.z1], [0, 0, 1, 0.1], [0.85, 0.82, 0.78]);
      B.quad('wood', [1.5, h.y0, h.z0 + 0.012], [1.83, h.y0, h.z0 + 0.012], [1.83, h.y1, h.z0 + 0.012], [1.5, h.y1, h.z0 + 0.012], [0, 0, 1, 1], [0.9, 0.88, 0.84]);
    }
    // window frame + glass, door frame, open door leaves
    const fr = [0.96, 0.95, 0.92];
    const frame = (yA, yB, zA, zB, x) => { B.box('paint', x - 0.03, x + 0.03, yA, yA + 0.06, zA, zB, fr); B.box('paint', x - 0.03, x + 0.03, yB - 0.06, yB, zA, zB, fr); B.box('paint', x - 0.03, x + 0.03, yA, yB, zB - 0.06, zB, fr); B.box('paint', x - 0.03, x + 0.03, yA, yB, zA, zA + 0.06, fr); };
    frame(-1.9, -0.8, 61.9, 63.3, 1.66); B.box('paint', 1.64, 1.68, -1.37, -1.33, 61.9, 63.3, fr); B.quad('glass', [1.66, -1.9, 61.9], [1.66, -0.8, 61.9], [1.66, -0.8, 63.3], [1.66, -1.9, 63.3]);
    B.box('paint', 1.45, 1.62, -2.0, -0.7, 61.84, 61.9, fr);                                    // sill
    B.box('plain', 1.3, 1.46, -1.85, -0.85, 61.12, 61.72, [0.93, 0.93, 0.9]);                    // radiator
    for (let y = -1.8; y < -0.86; y += 0.09) B.box('plain', 1.27, 1.3, y, y + 0.05, 61.14, 61.7, [0.88, 0.88, 0.85]);
    const leaf = (hy, sgn) => { // door leaf opened inward, hinged at (1.5, hy)
      const ax = [-0.985, sgn * 0.17], L = 0.7, c = (u) => [1.5 + ax[0] * u, hy + ax[1] * u];
      const seg = (u0, u1, z0, z1, k = 'paint', col = fr) => { const a = c(u0), b = c(u1); B.obox(k, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], ax, (u1 - u0) / 2, 0.02, z0, z1, col); };
      seg(0, 0.07, zF + 0.02, 63.2); seg(L - 0.07, L, zF + 0.02, 63.2); seg(0, L, 63.13, 63.2); seg(0, L, zF + 0.02, zF + 0.32); seg(0, L, 62.0, 62.05); seg(0, L, 62.6, 62.64);
      const a = c(0.07), b = c(L - 0.07); B.quad('glass', [a[0], a[1], zF + 0.3], [b[0], b[1], zF + 0.3], [b[0], b[1], 63.13], [a[0], a[1], 63.13]);
      const hk = c(L - 0.1); B.box('brass', hk[0] - 0.02, hk[0] + 0.02, hk[1] - 0.06 * sgn - 0.03, hk[1] - 0.06 * sgn + 0.03, 62.02, 62.06, [0.8, 0.65, 0.3]);
    };
    leaf(0.0, -1); leaf(1.4, 1);
    // room shell
    B.quad('parquet', [-3.2, -2.4, zF], [1.5, -2.4, zF], [1.5, 2.2, zF], [-3.2, 2.2, zF], [0, 0, 1.9, 1.86], [1, 1, 1]);
    B.quad('wallInt', [-3.2, 2.2, zC], [1.5, 2.2, zC], [1.5, -2.4, zC], [-3.2, -2.4, zC], [0, 0, 1, 1], [0.97, 0.96, 0.93]);
    const wc = [0.94, 0.91, 0.84];
    B.wall('wallInt', -3.2, 2.2, 1.5, 2.2, zF, zC, [0, 0, 1, 0.6], wc); B.wall('wallInt', 1.5, -2.4, -3.2, -2.4, zF, zC, [0, 0, 1, 0.6], wc); B.wall('wallInt', -3.2, -2.4, -3.2, 2.2, zF, zC, [0, 0, 1, 0.6], wc);
    B.box('paint', -3.2, 1.5, 2.17, 2.2, zF, zF + 0.1, fr); B.box('paint', -3.2, -3.17, -2.4, 2.2, zF, zF + 0.1, fr); B.box('paint', 1.47, 1.5, 1.4, 2.2, zF, zF + 0.1, fr); B.box('paint', 1.47, 1.5, -2.4, 0, zF, zF + 0.1, fr);
    B.box('paint', -3.2, 1.5, 2.14, 2.2, zC - 0.08, zC, fr);                                     // cornice
    // rug
    B.quad('kilim', [-2.2, -1.5, zF + 0.012], [0.9, -1.5, zF + 0.012], [0.9, 0.95, zF + 0.012], [-2.2, 0.95, zF + 0.012], [0, 0, 1, 1], [1, 1, 1]);
    // sofa along the north wall
    for (const [lx, ly] of [[-2.0, 1.33], [-0.1, 1.33], [-2.0, 2.1], [-0.1, 2.1]]) B.cyl('wood', lx, ly, zF, zF + 0.12, 0.025, 0.03, [0.4, 0.28, 0.2], 8);
    // pictures above the sofa
    [[-1.72, 0.5, 0.62, 'pic0'], [-1.05, 0.62, 0.78, 'pic1'], [-0.3, 0.46, 0.58, 'pic2']].forEach(([x, w, h, m]) => { B.box('wood', x - w / 2 - 0.03, x + w / 2 + 0.03, 2.16, 2.2, zF + 1.62 - h / 2 - 0.03, zF + 1.62 + h / 2 + 0.03, [0.25, 0.2, 0.17]); B.quad(m, [x - w / 2, 2.155, zF + 1.62 - h / 2], [x + w / 2, 2.155, zF + 1.62 - h / 2], [x + w / 2, 2.155, zF + 1.62 + h / 2], [x - w / 2, 2.155, zF + 1.62 + h / 2]); });
    // brass tray table with tea
    { const tx = 0.55, ty = 1.42; for (const [dx, dy] of [[0.2, 0.2], [-0.2, 0.2], [0.2, -0.2], [-0.2, -0.2]]) B.cyl('wood', tx + dx, ty + dy, zF, zF + 0.46, 0.02, 0.02, [0.3, 0.2, 0.14], 6);
      B.cyl('brass', tx, ty, zF + 0.46, zF + 0.48, 0.36, 0.38, [0.72, 0.52, 0.2], 28); B.cyl('brass', tx, ty, zF + 0.48, zF + 0.5, 0.385, 0.385, [0.66, 0.46, 0.16], 28, false);
      const glass = (gx, gy) => { B.cyl('plain', gx, gy, zF + 0.48, zF + 0.487, 0.055, 0.055, [0.95, 0.95, 0.95], 14); B.cyl('emis', gx, gy, zF + 0.487, zF + 0.52, 0.02, 0.026, [0.55, 0.13, 0.03], 12); B.cyl('emis', gx, gy, zF + 0.52, zF + 0.55, 0.026, 0.019, [0.6, 0.16, 0.04], 12); B.cyl('glass', gx, gy, zF + 0.55, zF + 0.585, 0.019, 0.027, [1, 1, 1], 12, false); };
      glass(tx - 0.1, ty - 0.08); glass(tx + 0.13, ty + 0.05);
      B.cyl('plain', tx + 0.02, ty + 0.2, zF + 0.48, zF + 0.56, 0.05, 0.06, [0.93, 0.93, 0.95], 12); }
    // plant in the corner
    { const px = 1.12, py = 1.82; B.cyl('plain', px, py, zF, zF + 0.36, 0.15, 0.2, [0.72, 0.42, 0.3], 14); const pr = rng(5);
      B.cyl('plain', px, py, zF + 0.36, zF + 1.4, 0.015, 0.01, [0.3, 0.25, 0.15], 6); }
    // ceiling lamp
    B.cyl('plain', -0.9, 0, zC - 0.5, zC, 0.006, 0.006, [0.2, 0.2, 0.2], 6); B.dome('plain', -0.9, 0, zC - 0.72, 0.22, [0.95, 0.93, 0.88], 16, 6, 1.0);
    // console on the west wall
    B.box('wood', -3.18, -2.75, -1.2, 0.6, zF + 0.12, zF + 0.8, [0.55, 0.4, 0.28]); B.box('wood', -3.16, -2.8, -0.9, -0.5, zF + 0.8, zF + 1.1, [0.2, 0.3, 0.45]);
  }

  // ---------------- terrace building opposite ----------------
  const zT = P2[2] - 1.6;
  {
    const h = heroes[1]; building(h, { top: zT, zb: 47.2, style: 1, tint: PAL[2], flat: true, near: true, floorMat: 'tile', floorCol: [1, 1, 1], props: false, h1: 1 });
    B.cyl('plain', 14.3, 4.4, zT, zT + 0.42, 0.2, 0.26, [0.7, 0.4, 0.28], 12); B.dome('plain', 14.3, 4.4, zT + 0.4, 0.4, [0.2, 0.4, 0.18], 10, 4, 1.2);
    B.cyl('plain', 13.2, 4.7, zT, zT + 0.3, 0.16, 0.2, [0.75, 0.72, 0.66], 12); B.dome('plain', 13.2, 4.7, zT + 0.28, 0.3, [0.25, 0.45, 0.2], 10, 4, 1.0);
    // table + chair
    B.cyl('plain', 12.6, -2.6, zT + 0.7, zT + 0.73, 0.4, 0.4, [0.92, 0.92, 0.9], 20); B.cyl('plain', 12.6, -2.6, zT, zT + 0.7, 0.03, 0.03, [0.3, 0.3, 0.3], 8);
    B.box('plain', 13.3, 13.75, -2.85, -2.4, zT + 0.42, zT + 0.46, [0.25, 0.4, 0.55]); B.box('plain', 13.72, 13.76, -2.85, -2.4, zT + 0.46, zT + 0.9, [0.25, 0.4, 0.55]); for (const [dx, dy] of [[13.32, -2.83], [13.72, -2.83], [13.32, -2.43], [13.72, -2.43]]) B.box('plain', dx, dx + 0.03, dy, dy + 0.03, zT, zT + 0.42, [0.2, 0.2, 0.2]);
    // water tank, antenna, clothes line
    B.cyl('plain', 14.2, -3.5, zT + 0.4, zT + 1.7, 0.6, 0.6, [0.2, 0.36, 0.6], 16); B.box('plain', 13.7, 14.7, -4.0, -3.0, zT, zT + 0.4, [0.35, 0.35, 0.35]);
    B.cyl('plain', 9.3, 4.9, zT, zT + 3.2, 0.02, 0.02, [0.3, 0.3, 0.3], 6); for (let i = 0; i < 5; i++) B.box('plain', 9.3 - 0.4 + i * 0.02, 9.3 + 0.4 - i * 0.02, 4.89, 4.91, zT + 2.3 + i * 0.2, zT + 2.32 + i * 0.2, [0.4, 0.4, 0.4]);
  }
  // ---------------- street-end roof (stop 3), T-junction building, waterfront roof (stop 4) ----------------
  building(heroes[2], { top: P3[2] - 1.6, zb: 46.5, style: 0, tint: PAL[6], flat: true, near: true, floorMat: 'roofing', floorCol: [0.74, 0.72, 0.7], props: false });
  B.box('f4', 17, 18.2, 103.6, 105.2, P3[2] - 1.6, P3[2] + 0.9, [0.8, 0.74, 0.66], 6, 'z'); 
  building(heroes[3], { floors: 5, zb: 48.3, style: 1, tint: PAL[8], flat: false, near: true, ns: true });
  building(heroes[4], { top: P4[2] - 1.6, style: 5, tint: PAL[5], flat: true, near: true, floorMat: 'roofing', floorCol: [0.78, 0.76, 0.73], props: false });
  B.box('f4', P4[0] - 8, P4[0] - 6.2, P4[1] + 5.5, P4[1] + 7.6, P4[2] - 1.6, P4[2] + 0.5, [0.82, 0.8, 0.76], 6, 'z');
  // quay strip
  for (let y = -1250; y < 1150; y += 25) { const x = coastX(y); B.quad('concrete', [x - 22, y, 2.25], [x + 1.5, y, 2.25], [coastX(y + 25) + 1.5, y + 25, 2.25], [coastX(y + 25) - 22, y + 25, 2.25], [0, 0, 6, 6], [0.62, 0.61, 0.6]); B.wall('concrete', x + 1.5, y, coastX(y + 25) + 1.5, y + 25, -1, 2.25, [0, 0, 6, 1], [0.45, 0.45, 0.44]); }

  for (const m of B.build(mats)) scene.add(m);
  { // sofa + plant leaves as rounded meshes
    const ft = TX.fabricTex(9); ft.repeat.set(4, 4); const fab = (c) => new THREE.MeshStandardMaterial({ color: new THREE.Color(...c), map: ft, roughness: 1 });
    const A = fab([0.20, 0.34, 0.33]), C = fab([0.24, 0.39, 0.38]);
    const rb = (m, x0, x1, y0, y1, z0, z1, rad = 0.06, rz = 0) => { const g = new RoundedBoxGeometry(x1 - x0, y1 - y0, z1 - z0, 4, rad); const me = new THREE.Mesh(g, m); me.position.set((x0 + x1) / 2, (y0 + y1) / 2, 61 + (z0 + z1) / 2); me.rotation.z = rz; me.castShadow = me.receiveShadow = true; scene.add(me); return me; };
    rb(A, -2.05, -0.05, 1.28, 2.15, 0.12, 0.42, 0.05); rb(A, -2.08, -1.84, 1.26, 2.15, 0.3, 0.68, 0.09); rb(A, -0.26, -0.02, 1.26, 2.15, 0.3, 0.68, 0.09); rb(A, -1.9, -0.2, 1.9, 2.16, 0.3, 0.95, 0.09);
    rb(C, -1.84, -1.05, 1.27, 1.95, 0.36, 0.52, 0.07); rb(C, -1.05, -0.26, 1.27, 1.95, 0.36, 0.52, 0.07);
    const b1 = rb(C, -1.83, -1.06, 1.74, 1.94, 0.48, 0.9, 0.09); b1.rotation.x = -0.12; const b2 = rb(C, -1.04, -0.27, 1.74, 1.94, 0.48, 0.9, 0.09); b2.rotation.x = -0.12;
    const p1 = rb(fab([0.80, 0.70, 0.50]), -1.8, -1.42, 1.58, 1.72, 0.5, 0.88, 0.07, 0.3); p1.rotation.x = -0.25; const p2 = rb(fab([0.62, 0.27, 0.18]), -0.66, -0.3, 1.6, 1.74, 0.5, 0.86, 0.07, -0.35); p2.rotation.x = -0.25;
    const lm = new THREE.MeshStandardMaterial({ color: 0x2c5a2e, roughness: 0.55 }), lg = new THREE.SphereGeometry(1, 12, 8), pr = rng(5);
    for (let i = 0; i < 15; i++) { const a = pr() * 6.28, hgt = 0.55 + i * 0.065, rad = 0.2 + pr() * 0.12; const l = new THREE.Mesh(lg, lm); l.scale.set(0.2, 0.085, 0.012); l.position.set(1.12 + Math.cos(a) * rad, 1.82 + Math.sin(a) * rad, 61 + hgt); l.rotation.set(0, -0.5 + pr() * 0.5, a, 'ZYX'); l.castShadow = true; scene.add(l); }
  }

  // trees (instanced)
  {
    const cone = new THREE.ConeGeometry(1.3, 10, 7); cone.rotateX(Math.PI / 2); cone.translate(0, 0, 5);
    const ball = new THREE.IcosahedronGeometry(3.4, 1); ball.translate(0, 0, 5.2);
    const mk = (geo, list, colr) => { const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: colr, flatShading: true }), list.length); const d = new THREE.Object3D(); list.forEach((t, i) => { d.position.set(t[0], t[1], ground(t[0], t[1]) - 0.3); d.scale.setScalar(t[3]); d.rotation.z = i; d.updateMatrix(); im.setMatrixAt(i, d.matrix); }); im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; scene.add(im); };
    mk(cone, trees.filter((t) => t[2] === 0), 0x26402a); mk(ball, trees.filter((t) => t[2] === 1), 0x4a6a32);
  }

  // ---------------- scarf ----------------
  const scarf = (() => {
    const NS = 46, NW = 8, wid = 0.32; const g = new THREE.PlaneGeometry(1, 1, NW, NS); const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.80, 0.035, 0.05), map: TX.knitTex(), roughness: 1, side: THREE.DoubleSide, emissive: new THREE.Color(0.10, 0.0, 0.0) });
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; dyn.add(mesh);
    const zr = zF + 1.035, cx = 2.985, cy = 1.735;          // rail corner
    const upd = (t) => {
      const p = g.attributes.position; let q = 0;
      for (let j = 0; j <= NS; j++) for (let i = 0; i <= NW; i++) {
        const s = j / NS * 2.05, w = (i / NW - 0.5) * wid; let x, y, z;
        if (s < 0.85) { // hangs on the east face, outside the rail
          const d = 0.85 - s, sw = d * d; x = cx + 0.045 + 0.05 * sw * Math.sin(1.7 * t + 3 * d) + 0.02 * sw * Math.sin(4.3 * t + 6 * d); y = cy - 0.5 + w + 0.03 * sw * Math.sin(1.3 * t + 1); z = zr - d;
        } else if (s < 1.25) { // lies over the corner of the rail
          const u = (s - 0.85) / 0.4, a = u * Math.PI / 2; x = cx + 0.045 - (0.045 + 0.18) * u + Math.cos(a) * 0 ; y = cy - 0.5 + 0.5 * u + w * (1 - u) + 0.06 * u; z = zr + 0.015 + 0.01 * Math.sin(u * 3.14); x += w * u * 1.0;
        } else { // hangs on the north face
          const d = s - 1.25, sw = d * d; x = cx - 0.18 + w; y = cy + 0.06 + 0.07 * sw * Math.sin(1.9 * t + 2.4 * d + 1) + 0.025 * sw * Math.sin(4.9 * t + 5 * d); z = zr - d; x += 0.03 * sw * Math.sin(1.1 * t);
        }
        const fold = 0.014 * Math.sin(w * 52 + s * 3) * Math.min(1, Math.abs(s - 1.05) * 4);
        if (s < 0.85) x += fold; else if (s >= 1.25) y += fold;
        p.setXYZ(q++, x, y, z);
      }
      p.needsUpdate = true; g.computeVertexNormals();
    };
    return { upd };
  })();
  // sheer curtain by the door
  const curtain = (() => {
    const g = new THREE.PlaneGeometry(1, 1, 22, 16); const m = new THREE.MeshStandardMaterial({ color: 0xfffdf6, transparent: true, opacity: 0.62, side: THREE.DoubleSide, roughness: 1, depthWrite: false });
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; dyn.add(mesh);
    const upd = (t) => { const p = g.attributes.position; let q = 0; for (let j = 0; j <= 16; j++) for (let i = 0; i <= 22; i++) { const u = i / 22, v = j / 16, low = v * v; p.setXYZ(q++, 1.38 - 0.05 * Math.sin(u * 24) - low * (0.22 + 0.16 * Math.sin(0.9 * t + u * 4)) * (0.4 + u), -0.52 + u * 0.62 - low * 0.08 * Math.sin(0.7 * t + 1), 63.5 - v * 2.46); } p.needsUpdate = true; g.computeVertexNormals(); };
    B.box; return { upd };
  })();

  // ---------------- sky, water, ferry, gulls ----------------
  const sky = makeSky(sunV); scene.add(sky);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(30000, 30000), new THREE.ShaderMaterial({
    uniforms: { sun: { value: sunV }, uT: { value: 0 }, uCam: { value: new THREE.Vector3() }, fogC: { value: new THREE.Color(0x9fb4cc).convertSRGBToLinear() }, fogD: { value: 0.00052 } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
    fragmentShader: `varying vec3 vW; uniform vec3 sun, uCam, fogC; uniform float uT, fogD; ${SKY_GLSL} ${NOISE_GLSL}
      void main(){ vec3 V = normalize(uCam - vW); float dist = length(uCam - vW);
        vec2 p = vW.xy; float fade = 1.0/(1.0+dist*0.0016);
        vec2 g = vec2(vn(p*0.35+vec2(uT*0.5,uT*0.3))-vn(p*0.35+vec2(0.6)+vec2(uT*0.5,uT*0.3)), vn(p*0.35+vec2(7.0)-vec2(uT*0.2,uT*0.45))-vn(p*0.35+vec2(7.6)-vec2(uT*0.2,uT*0.45)));
        float f2 = 1.0/(1.0+dist*0.012), f3 = 1.0/(1.0+dist*0.0007);
        g = g*f2 + 0.9*vec2(vn(p*0.045+uT*0.08)-0.5, vn(p*0.045+5.0-uT*0.07)-0.5)*fade + 1.2*vec2(vn(p*0.011+uT*0.03)-0.5, vn(p*0.011+9.0-uT*0.02)-0.5)*f3 + 0.5*vec2(vn(p*1.3-uT*0.9)-0.5, vn(p*1.3+3.0+uT*0.8)-0.5)*f2;
        vec3 n = normalize(vec3(g*0.5, 1.0));
        vec3 R = reflect(-V, n); R.z = abs(R.z);
        float F = 0.03 + 0.97*pow(1.0 - max(dot(n, V), 0.0), 5.0);
        vec3 deep = vec3(0.012, 0.075, 0.115);
        vec3 c = mix(deep, skyColor(R, sun)*0.75, F);
        c += vec3(1.0,0.86,0.62) * pow(max(dot(R, sun), 0.0), 220.0) * 9.0;
        c = mix(fogC, c, exp(-dist*fogD*0.9));
        gl_FragColor = vec4(c, 1.0); }`,
  })); water.position.z = 0; water.frustumCulled = false; dyn.add(water);
  // ferry
  const ferry = new THREE.Group();
  {
    const F = new Builder(), wh = [0.95, 0.95, 0.93], dk = [0.06, 0.07, 0.09], gl = [0.10, 0.16, 0.24];
    F.box('plain', -20, 18, -4.6, 4.6, 0.2, 1.3, dk); F.box('plain', -20.5, 18.5, -4.8, 4.8, 1.3, 3.3, wh);
    F.tri('plain', [18.5, -4.8, 3.3], [18.5, 4.8, 3.3], [25, 0, 3.5], wh); F.quad('plain', [18.5, -4.8, 0.3], [25, 0, 0.6], [25, 0, 3.5], [18.5, -4.8, 3.3], [0, 0, 1, 1], wh); F.quad('plain', [25, 0, 0.6], [18.5, 4.8, 0.3], [18.5, 4.8, 3.3], [25, 0, 3.5], [0, 0, 1, 1], wh);
    F.box('plain', -18, 15, -4.3, 4.3, 3.3, 5.7, wh); F.box('plain', -18.05, 15.05, -4.35, 4.35, 4.0, 4.9, gl, 1, 'Zz');
    F.box('plain', -14, 9, -3.7, 3.7, 5.7, 7.9, wh); F.box('plain', -14.05, 9.05, -3.75, 3.75, 6.3, 7.2, gl, 1, 'Zz');
    F.box('plain', 5, 10.5, -2.6, 2.6, 7.9, 9.8, wh); F.box('plain', 4.95, 10.55, -2.65, 2.65, 8.6, 9.4, gl, 1, 'Zz');
    F.cyl('plain', -4, 0, 7.9, 11.4, 1.5, 1.4, [0.92, 0.72, 0.16], 14); F.cyl('plain', -4, 0, 11.4, 12.4, 1.42, 1.4, dk, 14); F.cyl('plain', 2, 0, 7.9, 13.5, 0.08, 0.05, wh, 6);
    for (const m of F.build({ default: std({}), plain: std({ roughness: 0.6 }) })) ferry.add(m);
    const wk = TX.canvasTex(256, 1024, (c, w, h) => { const rr = rng(4); for (let y = 0; y < h; y++) { const v = y / h, half = (0.05 + 0.45 * v) * w, a = Math.pow(1 - v, 1.4); for (let k = 0; k < 14; k++) { const x = w / 2 + (rr() * 2 - 1) * half; const edge = Math.abs(x - w / 2) / half; c.fillStyle = `rgba(255,255,255,${a * (0.25 + 0.75 * edge * edge) * rr()})`; c.fillRect(x, y, 3 + rr() * 5, 1 + rr() * 2); } } }, { clamp: true });
    const wake = new THREE.Mesh(new THREE.PlaneGeometry(90, 420), new THREE.MeshBasicMaterial({ map: wk, transparent: true, depthWrite: false, color: new THREE.Color(1.3, 1.3, 1.3) }));
    wake.rotation.z = Math.PI / 2; wake.position.set(-228, 0, 0.08); ferry.add(wake); dyn.add(ferry); ferry.traverse((o) => { o.castShadow = o.receiveShadow = false; });
  }
  const gulls = [];
  { const gr = rng(8); const gm = new THREE.MeshBasicMaterial({ color: 0xf2f2ee, side: THREE.DoubleSide });
    const defs = [[40, 8, 68, 22], [120, -40, 60, 34], [300, 120, 44, 60], [15, 60, 72, 26], [P4[0] + 40, P4[1] - 60, 22, 36], [P4[0] - 30, P4[1] - 90, 16, 28], [P4[0] + 90, P4[1] - 30, 30, 50], [420, -100, 20, 70], [9690, 870, 262, 40], [9740, 900, 250, 30]];
    for (const d of defs) { const g = new THREE.Group(); const wing = (s) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.12, 0, 0, -0.14, 0, s * 0.62, 0.02, 0, 0, -0.14, 0, s * 0.62, -0.1, 0, s * 0.62, 0.02, 0], 3)); const m = new THREE.Mesh(geo, gm); m.frustumCulled = false; return m; }; const a = wing(1), b = wing(-1); g.add(a, b); g.userData = { c: d, w: 0.18 + gr() * 0.12, ph: gr() * 6.28, a, b, dir: gr() < 0.5 ? 1 : -1 }; dyn.add(g); gulls.push(g); } }

  // ---------------- lights ----------------
  const sun = new THREE.DirectionalLight(new THREE.Color(1.0, 0.84, 0.66), 3.1); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.02; scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(new THREE.Color(0.62, 0.74, 1.0), new THREE.Color(0.55, 0.48, 0.40), 0.85); scene.add(hemi);
  const bounce = new THREE.PointLight(new THREE.Color(1.0, 0.78, 0.55), 2.2, 9, 1.6); bounce.position.set(-0.6, 1.0, zF + 0.5); scene.add(bounce);
  const bounce2 = new THREE.PointLight(new THREE.Color(1.0, 0.9, 0.8), 1.2, 8, 1.5); bounce2.position.set(-1.0, -0.6, zC - 0.6); scene.add(bounce2);
  const touchShadow = new THREE.Mesh(new THREE.CircleGeometry(0.16, 20), new THREE.MeshBasicMaterial({ map: TX.canvasTex(64, 64, (c) => { const g = c.createRadialGradient(32, 32, 2, 32, 32, 31); g.addColorStop(0, 'rgba(0,0,0,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); }, { clamp: true }), transparent: true, depthWrite: false, opacity: 0 }));
  touchShadow.position.set(W.sofaTouch[0] + 0.04, W.sofaTouch[1] + 0.03, zF + 0.525); dyn.add(touchShadow);
  { const s2 = new THREE.DirectionalLight(sun.color, sun.intensity); s2.position.set(...W.sunDir); dyn.add(s2); dyn.add(new THREE.HemisphereLight(hemi.color, hemi.groundColor, hemi.intensity)); }

  const SH = [[15, 60], [15, 60], [45, 160], [190, 500], [700, 1500]];
  let shadowStop = -1, prepped = false; const depthMat = new THREE.MeshBasicMaterial({ colorWrite: false });
  const camPos = new THREE.Vector3();
  const lean = (t) => sstep(13.2, 15.4, t) * (1 - sstep(20.3, 22.6, t));
  const setShadow = (renderer, stop) => {
    if (shadowStop === stop) return; shadowStop = stop; const p = P[stop];
    const [hs, dist] = SH[stop]; const sc = sun.shadow.camera; sc.left = -hs; sc.right = hs; sc.top = hs; sc.bottom = -hs; sc.near = 1; sc.far = dist * 2 + 400; sc.updateProjectionMatrix();
    const tx = stop === 4 ? p[0] + 60 : p[0], ty = stop === 4 ? p[1] + 500 : p[1], tz = stop === 4 ? 30 : p[2] - 2;
    sun.target.position.set(tx, ty, tz); sun.position.set(tx + W.sunDir[0] * (dist + 200), ty + W.sunDir[1] * (dist + 200), tz + W.sunDir[2] * (dist + 200)); sun.target.updateMatrixWorld();
    bounce.visible = bounce2.visible = stop <= 2; renderer.shadowMap.needsUpdate = true;
  };
  const nearOf = (stop) => stop <= 1 ? 0.12 : 0.3;
  return {
    name: 'istanbul', scene,
    async prepare() {},
    adapt(t, stop) { return [stop <= 1 ? 1.3 : 0.9, 1]; },
    isLive(t, stop) { return stop === 1 && lean(t) > 0; },
    pos(stop) { return P[stop]; }, range(stop) { return [nearOf(stop), 40000]; },
    // static world for one panorama face (or for the live camera while the player leans over the sofa)
    renderStatic(renderer, rt, cam, stop) {
      setShadow(renderer, stop); sky.position.copy(cam.position);
      renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, cam);
    },
    setCamera(camera, c) {
      const { t, stop } = c; const p = P[stop]; camPos.set(p[0], p[1], p[2]);
      if (stop === 1) { const k = lean(t); camPos.x += 0.02 * k; camPos.y += 0.30 * k; camPos.z -= 0.36 * k; }
      camera.position.copy(camPos); camera.near = nearOf(stop); camera.far = 40000; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    },
    renderDynamic(renderer, rt, camera, c) {
      const { t, stop } = c;
      water.material.uniforms.uT.value = t; water.material.uniforms.uCam.value.copy(camera.position);
      scarf.upd(t); curtain.upd(t);
      const fx = 1020 - 1.5 * t, fy = -78 - 6 * t; ferry.position.set(fx, fy, 0); ferry.rotation.z = Math.atan2(-6, -1.5);
      for (const g of gulls) { const u = g.userData, a = u.ph + u.dir * u.w * t, R = u.c[3]; g.position.set(u.c[0] + Math.cos(a) * R, u.c[1] + Math.sin(a) * R, u.c[2] + 2 * Math.sin(t * 0.3 + u.ph)); g.rotation.z = a + u.dir * Math.PI / 2 - Math.PI / 2; const f = 0.25 + 0.5 * Math.sin(t * 5.2 + u.ph) * (0.5 + 0.5 * Math.sin(t * 0.4 + u.ph)); u.a.rotation.y = -f; u.b.rotation.y = f; g.scale.setScalar(1.15); }
      touchShadow.material.opacity = 0.5 * sstep(16.4, 17.0, t) * (1 - sstep(19.3, 19.9, t));
      renderer.setRenderTarget(rt); const ac = renderer.autoClear; renderer.autoClear = false; renderer.render(dyn, camera); renderer.autoClear = ac;
      const inside = stop <= 1;
      return { bloom: inside ? 0.3 : 0.22, threshold: inside ? 1.6 : 1.8, radius: 0.6,
        hand: { key: stop === 0 ? 0.5 : stop === 1 ? 2.6 : 3.4, amb: inside ? 0.9 : 1.3, fill: 0.35, sky: new THREE.Color(0.75, 0.82, 1.0), ground: new THREE.Color(0.6, 0.5, 0.4), color: new THREE.Color(1.0, 0.86, 0.7), worldDir: W.sunDir } };
    },
  };
}
