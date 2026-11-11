import * as THREE from 'three';
import { Builder } from './builder.js';
import * as TX from './textures.js';
import { rng, DEG } from './util.js';
import { makeSky, PAL } from './istanbul.js';
// Stop 5: a residential street on the ridge across the strait. Local frame: camera at (0,0,1.6), same ENU axes.
export function buildRidge(tl) {
  const W = tl.W, r = rng(505); const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x9fb4cc, 0.0006);
  const sunV = new THREE.Vector3(...W.sunDir); const sky = makeSky(sunV); scene.add(sky);
  const L = (o) => new THREE.MeshLambertMaterial({ vertexColors: true, ...o });
  const mats = { default: L({}), plain: L({}), f3: L({ map: TX.facadeTex(3, 41) }), f3b: L({ map: TX.facadeTex(3, 42) }), f0: L({ map: TX.facadeTex(0, 43) }), f4: L({ map: TX.facadeTex(4, 44) }), asphalt: L({ map: TX.roofingTex(45) }), paver: L({ map: TX.cobbleTex(46) }), concrete: L({ map: TX.concreteTex(47) }),
    glass: new THREE.MeshStandardMaterial({ color: 0x1c2a36, roughness: 0.15, metalness: 0.5 }) };
  const B = new Builder(); const a = 80 * DEG, u = [Math.sin(a), Math.cos(a)], v = [-u[1], u[0]];
  const P = (cu, cv, z) => [cu * u[0] + cv * v[0], cu * u[1] + cv * v[1], z];
  const wallUV = (k, u0, v0, u1, v1, z0, z1, uv, col) => { const q = P(u0, v0, 0), p = P(u1, v1, 0); B.wall(k, p[0], p[1], q[0], q[1], z0, z1, uv, col); };
  const flat = (k, u0, u1, v0, v1, z, s, col) => B.quad(k, P(u0, v0, z), P(u1, v0, z), P(u1, v1, z), P(u0, v1, z), [0, 0, (u1 - u0) / s, (v1 - v0) / s], col);
  const obox = (k, u0, u1, v0, v1, z0, z1, col, s = 2) => { const c = P((u0 + u1) / 2, (v0 + v1) / 2, 0); B.obox(k, c, u, (u1 - u0) / 2, (v1 - v0) / 2, z0, z1, col, s); };
  // ground
  flat('asphalt', -80, 260, -4.5, 4.5, 0, 6, [0.42, 0.42, 0.44]); flat('paver', -80, 260, 4.5, 6.6, 0.14, 1.2, [0.9, 0.86, 0.8]); flat('paver', -80, 260, -6.6, -4.5, 0.14, 1.2, [0.9, 0.86, 0.8]);
  obox('concrete', -80, 260, 4.4, 4.5, 0, 0.14, [0.7, 0.7, 0.7]); obox('concrete', -80, 260, -4.5, -4.4, 0, 0.14, [0.7, 0.7, 0.7]);
  for (let x = -70; x < 250; x += 9) obox('plain', x, x + 3, -0.07, 0.07, 0.0, 0.012, [0.85, 0.85, 0.8]);
  flat('plain', -300, 500, -300, 300, -0.05, 10, [0.4, 0.42, 0.36]);
  // apartment rows
  const tints = [PAL[0], PAL[1], [0.93, 0.86, 0.62], [0.90, 0.76, 0.66], PAL[5], [0.80, 0.86, 0.84], [0.93, 0.80, 0.56], PAL[8]];
  const awn = [[0.65, 0.16, 0.14], [0.12, 0.33, 0.5], [0.16, 0.42, 0.26], [0.85, 0.62, 0.12], [0.3, 0.3, 0.32]];
  for (const side of [1, -1]) {
    let x = -78;
    while (x < 250) {
      const len = 13 + r() * 9, floors = 5 + Math.floor(r() * 4), tint = tints[Math.floor(r() * tints.length)], gh = 3.6, zt = gh + floors * 2.9;
      const v0 = side * 6.6, v1 = side * 21, nb = Math.round(len / 3.4), k = r() < 0.5 ? 'f3' : 'f3b';
      const gapHere = x > 52 && x < 60 && side === 1;
      if (!gapHere) {
        // street facade (faces -side), back and sides
        if (side === 1) { wallUV(k, x + len, v0, x, v0, gh, zt, [0, 0, nb, floors], tint); wallUV('f0', x, v1, x + len, v1, 0, zt, [0, 0, nb, floors + 1], tint); wallUV('f4', x, v0, x, v1, 0, zt, [0, 0, 2.4, zt / 6], tint); wallUV('f4', x + len, v1, x + len, v0, 0, zt, [0, 0, 2.4, zt / 6], tint); }
        else { wallUV(k, x, v0, x + len, v0, gh, zt, [0, 0, nb, floors], tint); wallUV('f0', x + len, v1, x, v1, 0, zt, [0, 0, nb, floors + 1], tint); wallUV('f4', x, v1, x, v0, 0, zt, [0, 0, 2.4, zt / 6], tint); wallUV('f4', x + len, v0, x + len, v1, 0, zt, [0, 0, 2.4, zt / 6], tint); }
        flat('asphalt', x, x + len, Math.min(v0, v1), Math.max(v0, v1), zt, 6, [0.55, 0.55, 0.55]);
        obox('concrete', x - 0.25, x + len + 0.25, Math.min(v0, v0 - side * 0.5), Math.max(v0, v0 - side * 0.5), zt - 0.1, zt + 0.5, [tint[0] * 0.9, tint[1] * 0.9, tint[2] * 0.9]);     // cornice overhang
        // ground floor: shop fronts
        const sc = [0.2, 0.2, 0.22]; if (side === 1) wallUV('plain', x + len, v0, x, v0, 0, gh, [0, 0, 1, 1], sc); else wallUV('plain', x, v0, x + len, v0, 0, gh, [0, 0, 1, 1], sc);
        const ns = Math.max(1, Math.round(len / 6));
        for (let i = 0; i < ns; i++) { const s0 = x + 0.5 + i * (len - 1) / ns, s1 = s0 + (len - 1) / ns - 0.5, ac = awn[Math.floor(r() * awn.length)];
          obox('glass', s0 + 0.2, s1 - 0.2, v0 - side * 0.03 - 0.03, v0 - side * 0.03 + 0.03, 0.4, 2.7, [1, 1, 1]);
          obox('plain', s0, s1, Math.min(v0, v0 - side * 0.25), Math.max(v0, v0 - side * 0.25), 2.8, 3.5, ac);
          if (r() < 0.6) { const pa = P(s0, v0 - side * 0.02, 2.8), pb = P(s1, v0 - side * 0.02, 2.8), pc = P(s1, v0 - side * 1.3, 2.35), pd = P(s0, v0 - side * 1.3, 2.35); if (side === 1) B.quad('plain', pb, pa, pd, pc, [0, 0, 1, 1], ac); else B.quad('plain', pa, pb, pc, pd, [0, 0, 1, 1], ac); if (side === 1) B.quad('plain', pa, pb, pc, pd, [0, 0, 1, 1], [ac[0] * 0.6, ac[1] * 0.6, ac[2] * 0.6]); else B.quad('plain', pb, pa, pd, pc, [0, 0, 1, 1], [ac[0] * 0.6, ac[1] * 0.6, ac[2] * 0.6]); } }
        // roof clutter: solar water heaters, tank
        for (let i = 0; i < 2; i++) { const cu = x + 2 + r() * (len - 4), cv = side * (9 + r() * 9); const c = P(cu, cv, 0); B.cyl('plain', c[0], c[1], zt + 1.0, zt + 1.6, 0.3, 0.3, [0.85, 0.85, 0.88], 10); obox('plain', cu - 0.9, cu + 0.9, cv - 0.5, cv + 0.5, zt + 0.2, zt + 0.9, [0.1, 0.12, 0.2]); }
      }
      x += len + (r() < 0.3 ? 2.5 + r() * 2 : 0.05) + (gapHere ? 0 : 0);
    }
  }
  // building closing the street far ahead, and the hills / city beyond
  { const tint = PAL[2]; wallUV('f3', 262, 30, 262, -30, 3.6, 3.6 + 7 * 2.9, [0, 0, 18, 7], tint); wallUV('plain', 262, 30, 262, -30, 0, 3.6, [0, 0, 1, 1], [0.2, 0.2, 0.22]); flat('asphalt', 262, 280, -30, 30, 3.6 + 7 * 2.9, 6, [0.5, 0.5, 0.5]); }
  // parked cars
  const carCols = [[0.75, 0.75, 0.78], [0.12, 0.13, 0.16], [0.55, 0.1, 0.1], [0.9, 0.9, 0.9], [0.16, 0.26, 0.42], [0.45, 0.47, 0.5]];
  for (const [cu, sd] of [[7, -1], [13.5, -1], [26, -1], [9.5, 1], [22, 1], [34, 1], [41, -1], [55, 1], [63, -1], [78, 1], [90, -1]]) {
    const cv = sd * 3.45, col = carCols[Math.floor(r() * carCols.length)];
    obox('plain', cu - 2.1, cu + 2.1, cv - 0.85, cv + 0.85, 0.32, 0.92, col); obox('plain', cu - 1.15, cu + 1.25, cv - 0.78, cv + 0.78, 0.92, 1.42, [col[0] * 0.9, col[1] * 0.9, col[2] * 0.9]);
    obox('glass', cu - 1.0, cu + 1.1, cv - 0.8, cv + 0.8, 1.0, 1.34, [1, 1, 1]);
    for (const du of [-1.35, 1.35]) obox('plain', cu + du - 0.32, cu + du + 0.32, cv - 0.88, cv + 0.88, 0.0, 0.62, [0.05, 0.05, 0.05]);
  }
  // lamp posts + overhead wires
  for (let x = -60; x < 250; x += 28) { const c = P(x, 4.9, 0); B.cyl('plain', c[0], c[1], 0, 8, 0.09, 0.06, [0.3, 0.32, 0.33], 8); obox('plain', x - 0.1, x + 0.1, 3.2, 4.9, 7.9, 8.0, [0.3, 0.32, 0.33]); obox('plain', x - 0.25, x + 0.25, 2.9, 3.5, 7.82, 7.92, [0.9, 0.9, 0.85]); }
  for (const m of B.build(mats)) scene.add(m);
  { // wires: thin tubes sagging across the street (they cross the sky when the player looks up)
    const wm = new THREE.MeshBasicMaterial({ color: 0x15171a, fog: false });
    const wire = (u0, v0, z0, u1, v1, z1, sag = 0.5) => { const pts = []; for (let i = 0; i <= 16; i++) { const k = i / 16, p = P(u0 + (u1 - u0) * k, v0 + (v1 - v0) * k, 0); pts.push(new THREE.Vector3(p[0], p[1], z0 + (z1 - z0) * k - sag * 4 * k * (1 - k))); } scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.018, 5), wm)); };
    wire(-6, 6.6, 12, -2, -6.6, 14.5); wire(3.5, 6.6, 9.5, 5.5, -6.6, 9, 0.4); wire(4, 6.6, 15, 9, -6.6, 12.5, 0.7); wire(-3, 6.6, 17.5, 12, -6.6, 16.5, 0.9); wire(14, 6.6, 11, 15, -6.6, 13, 0.5); wire(-30, 4.9, 7.6, 250, 4.9, 7.6, 0.0); wire(24, 6.6, 14, 21, -6.6, 15, 0.6);
  }
  // street trees
  { const tr = new THREE.MeshLambertMaterial({ color: 0x4f7036, flatShading: true }), tk = new THREE.MeshLambertMaterial({ color: 0x4a3b2c });
    for (const [cu, sd, s] of [[17, 1, 1], [46, -1, 1.2], [70, 1, 0.9], [-12, -1, 1.1], [104, -1, 1.2], [128, 1, 1]]) { const c = P(cu, sd * 5.5, 0); const t = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 4.4, 8), tk); t.rotation.x = Math.PI / 2; t.position.set(c[0], c[1], 2.2); const b = new THREE.Mesh(new THREE.IcosahedronGeometry(2.3 * s, 1), tr); b.position.set(c[0], c[1], 5.4); b.scale.set(1, 1, 0.85); for (const m of [t, b]) { m.castShadow = m.receiveShadow = true; scene.add(m); } } }
  const sun = new THREE.DirectionalLight(new THREE.Color(1.0, 0.84, 0.66), 3.1); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  const sc = sun.shadow.camera; sc.left = -110; sc.right = 110; sc.top = 110; sc.bottom = -110; sc.near = 1; sc.far = 900; sun.target.position.set(60, 10, 8); sun.position.set(60 + W.sunDir[0] * 400, 10 + W.sunDir[1] * 400, 8 + W.sunDir[2] * 400); scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(new THREE.Color(0.62, 0.74, 1.0), new THREE.Color(0.5, 0.46, 0.42), 0.95));
  let first = true;
  return {
    name: 'ridge', scene, async prepare() {}, adapt: () => [0.9, 1], isLive: () => false, pos: () => [0, 0, 1.6], range: () => [0.3, 40000],
    renderStatic(renderer, rt, cam) { if (first) { first = false; } renderer.shadowMap.needsUpdate = true; sky.position.copy(cam.position); renderer.setRenderTarget(rt); renderer.setClearColor(0, 1); renderer.clear(); renderer.render(scene, cam); },
    setCamera(camera) { camera.position.set(0, 0, 1.6); camera.near = 0.3; camera.far = 40000; camera.updateProjectionMatrix(); camera.updateMatrixWorld(); },
    renderDynamic() { return { bloom: 0.22, threshold: 1.8, radius: 0.6, hand: { key: 1.2, amb: 1.3, fill: 0.35, sky: new THREE.Color(0.75, 0.82, 1.0), ground: new THREE.Color(0.6, 0.5, 0.4), color: new THREE.Color(1.0, 0.86, 0.7), worldDir: W.sunDir } }; },
  };
}
