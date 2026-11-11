// Procedural cosmic web. Units: million light-years (Mly), origin = home.
// Voronoi seeds are void centres; walls / filaments / nodes are the cell boundaries.
import { hash3, sub, add, mul, dot, cross, len, norm } from './util.js';
export const CELL = 260;
export function seedOf(i, j, k) {
  return [(i + 0.5 + 0.8 * (hash3(i, j, k, 1) - 0.5)) * CELL,
          (j + 0.5 + 0.8 * (hash3(i, j, k, 2) - 0.5)) * CELL,
          (k + 0.5 + 0.8 * (hash3(i, j, k, 3) - 0.5)) * CELL];
}
export function nearSeeds(p, n = 3, span = 1) {
  const ci = Math.floor(p[0] / CELL), cj = Math.floor(p[1] / CELL), ck = Math.floor(p[2] / CELL);
  const best = [];
  for (let i = ci - span; i <= ci + span; i++) for (let j = cj - span; j <= cj + span; j++) for (let k = ck - span; k <= ck + span; k++) {
    const s = seedOf(i, j, k); const d = (s[0] - p[0]) ** 2 + (s[1] - p[1]) ** 2 + (s[2] - p[2]) ** 2;
    let q = best.length; while (q > 0 && best[q - 1].d > d) q--;
    if (q < n) { best.splice(q, 0, { s, d }); if (best.length > n) best.pop(); }
  }
  return best;
}
function toWall(p) {
  const [a, b] = nearSeeds(p, 2); const ab = sub(b.s, a.s); const L = len(ab);
  return add(p, mul(ab, (a.d - b.d) / (-2 * L * L)));
}
function toFilament(p) {
  const [a, b, c] = nearSeeds(p, 3);
  const ab = sub(b.s, a.s), ac = sub(c.s, a.s); const n = cross(ab, ac); const n2 = dot(n, n);
  // circumcentre of triangle abc
  const cc = add(a.s, mul(add(mul(cross(n, ab), dot(ac, ac)), mul(cross(ac, n), dot(ab, ab))), 1 / (2 * n2)));
  const nn = norm(n);
  return add(cc, mul(nn, dot(sub(p, cc), nn)));
}
// sample galaxies of the web inside a ball. Returns Float32Array xyz relative to centre, plus kind per point.
export function sampleWeb(centre, R, count, rand, o = {}) {
  const fVoid = o.fVoid ?? 0.06, fWall = o.fWall ?? 0.24, thick = o.thick ?? 5, clump = o.clump ?? 0.5;
  const out = new Float32Array(count * 3); const kind = new Uint8Array(count);
  let n = 0, guard = 0;
  while (n < count && guard++ < count * 6) {
    let p = add(centre, mul(rand.ball(), R * 1.04));
    const u = rand(); let kd = 0, th = 30;
    if (u > fVoid + fWall) { p = toFilament(toFilament(p)); kd = 2; th = thick; }
    else if (u > fVoid) { p = toWall(toWall(p)); kd = 1; th = thick * 1.6; }
    const m = (kd === 2 && rand() < clump) ? 1 + Math.floor(rand() * 4) : 1;   // small groups along filaments
    for (let q = 0; q < m && n < count; q++) {
      const g = [p[0] + rand.gauss() * th, p[1] + rand.gauss() * th, p[2] + rand.gauss() * th];
      const r = sub(g, centre); if (len(r) > R) continue;
      out[n * 3] = r[0]; out[n * 3 + 1] = r[1]; out[n * 3 + 2] = r[2]; kind[n] = kd; n++;
    }
  }
  return { pos: out.subarray(0, n * 3), kind: kind.subarray(0, n), n };
}
// a void centre to aim at: seed 200-520 Mly away, closest to the preferred heading
export function pickVoid(p, prefer, maxAngleCos = 0.3) {
  let best = null, bs = -1e9;
  for (const c of nearSeeds(p, 60, 2)) {
    const r = sub(c.s, p), d = len(r); if (d < 210 || d > 520) continue;
    const ca = dot(r, prefer) / d; if (ca < maxAngleCos) continue;
    const score = ca * 1.2 - Math.abs(d - 300) / 400;
    if (score > bs) { bs = score; best = c.s; }
  }
  return best || add(p, mul(prefer, 300));
}
