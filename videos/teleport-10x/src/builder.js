import * as THREE from 'three';
// Accumulates quads per material and emits one merged mesh per material.
export class Builder {
  constructor(cell = 0) { this.m = {}; this.cell = cell; }
  buf(k, a) { if (this.cell && a) k = k + '|' + Math.floor(a[0] / this.cell) + '|' + Math.floor(a[1] / this.cell); return this.m[k] ??= { p: [], n: [], u: [], c: [], i: [] }; }
  // a,b,c,d counter-clockwise seen from the front. uv = [u0,v0,u1,v1] : a=(u0,v0) b=(u1,v0) c=(u1,v1) d=(u0,v1)
  quad(k, a, b, c, d, uv = [0, 0, 1, 1], col = [1, 1, 1]) {
    const B = this.buf(k, a), s = B.p.length / 3;
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
    let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]; const l = Math.hypot(...n) || 1; n = [n[0] / l, n[1] / l, n[2] / l];
    B.p.push(...a, ...b, ...c, ...d); for (let q = 0; q < 4; q++) { B.n.push(...n); B.c.push(...col); }
    B.u.push(uv[0], uv[1], uv[2], uv[1], uv[2], uv[3], uv[0], uv[3]); B.i.push(s, s + 1, s + 2, s, s + 2, s + 3);
  }
  tri(k, a, b, c, col = [1, 1, 1], uv = [0, 0, 1, 0, 0.5, 1]) {
    const B = this.buf(k, a), s = B.p.length / 3;
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]; const l = Math.hypot(...n) || 1; n = [n[0] / l, n[1] / l, n[2] / l];
    B.p.push(...a, ...b, ...c); for (let q = 0; q < 3; q++) { B.n.push(...n); B.c.push(...col); } B.u.push(...uv); B.i.push(s, s + 1, s + 2);
  }
  // vertical wall from (x0,y0) to (x1,y1) (outward normal = (dy,-dx)), z0..z1
  wall(k, x0, y0, x1, y1, z0, z1, uv, col) { this.quad(k, [x0, y0, z0], [x1, y1, z0], [x1, y1, z1], [x0, y0, z1], uv, col); }
  // axis-aligned box; s = metres per uv unit; skip: string of faces to omit among 'xXyYzZ' (lower = min side)
  box(k, x0, x1, y0, y1, z0, z1, col = [1, 1, 1], s = 1, skip = '') {
    const sx = (x1 - x0) / s, sy = (y1 - y0) / s, sz = (z1 - z0) / s;
    if (!skip.includes('X')) this.wall(k, x1, y0, x1, y1, z0, z1, [0, 0, sy, sz], col);
    if (!skip.includes('x')) this.wall(k, x0, y1, x0, y0, z0, z1, [0, 0, sy, sz], col);
    if (!skip.includes('Y')) this.wall(k, x1, y1, x0, y1, z0, z1, [0, 0, sx, sz], col);
    if (!skip.includes('y')) this.wall(k, x0, y0, x1, y0, z0, z1, [0, 0, sx, sz], col);
    if (!skip.includes('Z')) this.quad(k, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, sx, sy], col);
    if (!skip.includes('z')) this.quad(k, [x0, y1, z0], [x1, y1, z0], [x1, y0, z0], [x0, y0, z0], [0, 0, sx, sy], col);
  }
  // oriented box: centre c, half extents along unit axes ax, ay (horizontal) and z
  obox(k, c, ax, hx, hy, z0, z1, col = [1, 1, 1], s = 1) {
    const ay = [-ax[1], ax[0]]; const P = (i, j, z) => [c[0] + ax[0] * hx * i + ay[0] * hy * j, c[1] + ax[1] * hx * i + ay[1] * hy * j, z];
    const f = (a, b, cc, d, w, h) => this.quad(k, a, b, cc, d, [0, 0, w / s, h / s], col);
    f(P(1, -1, z0), P(1, 1, z0), P(1, 1, z1), P(1, -1, z1), 2 * hy, z1 - z0); f(P(-1, 1, z0), P(-1, -1, z0), P(-1, -1, z1), P(-1, 1, z1), 2 * hy, z1 - z0);
    f(P(1, 1, z0), P(-1, 1, z0), P(-1, 1, z1), P(1, 1, z1), 2 * hx, z1 - z0); f(P(-1, -1, z0), P(1, -1, z0), P(1, -1, z1), P(-1, -1, z1), 2 * hx, z1 - z0);
    f(P(-1, -1, z1), P(1, -1, z1), P(1, 1, z1), P(-1, 1, z1), 2 * hx, 2 * hy); f(P(-1, 1, z0), P(1, 1, z0), P(1, -1, z0), P(-1, -1, z0), 2 * hx, 2 * hy);
  }
  // vertical cylinder / cone (r1 top radius)
  cyl(k, cx, cy, z0, z1, r0, r1 = r0, col = [1, 1, 1], seg = 12, cap = true) {
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * 2 * Math.PI, a1 = (i + 1) / seg * 2 * Math.PI;
      const p = (a, r, z) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r, z];
      if (r1 > 1e-6) this.quad(k, p(a0, r0, z0), p(a1, r0, z0), p(a1, r1, z1), p(a0, r1, z1), [i / seg * 3, 0, (i + 1) / seg * 3, (z1 - z0)], col);
      else this.tri(k, p(a0, r0, z0), p(a1, r0, z0), [cx, cy, z1], col);
      if (cap && r1 > 1e-6) this.tri(k, p(a0, r1, z1), p(a1, r1, z1), [cx, cy, z1], col);
    }
  }
  // half dome / sphere cap
  dome(k, cx, cy, z0, r, col = [1, 1, 1], seg = 16, rings = 6, squash = 1) {
    for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
      const p = (a, e) => [cx + Math.cos(a) * Math.cos(e) * r, cy + Math.sin(a) * Math.cos(e) * r, z0 + Math.sin(e) * r * squash];
      const a0 = i / seg * 2 * Math.PI, a1 = (i + 1) / seg * 2 * Math.PI, e0 = j / rings * Math.PI / 2, e1 = (j + 1) / rings * Math.PI / 2;
      this.quad(k, p(a0, e0), p(a1, e0), p(a1, e1), p(a0, e1), [0, 0, 1, 1], col);
    }
  }
  build(mats, o = {}) {
    const out = [];
    for (const k in this.m) {
      const B = this.m[k]; if (!B.p.length) continue; const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(B.n, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(B.u, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(B.c, 3)); g.setIndex(B.i);
      const mk = k.split('|')[0]; const mesh = new THREE.Mesh(g, mats[mk] || mats.default); mesh.name = mk; g.computeBoundingSphere();
      mesh.castShadow = o.cast ?? !(mats[mk]?.transparent); mesh.receiveShadow = o.receive ?? true; mesh.frustumCulled = !!this.cell; out.push(mesh);
    }
    return out;
  }
}
