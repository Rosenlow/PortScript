// Shared math helpers. World frame everywhere: X east, Y north, Z up (ENU at the apartment), metres.
export const DEG = Math.PI / 180;
export const LY = 9.4607e15;          // metres
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a) => mul(a, 1 / (len(a) || 1));
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const angleBetween = (a, b) => Math.acos(clamp(dot(norm(a), norm(b)), -1, 1)) / DEG;

export function dirFromAzPitch(az, p) {
  const a = az * DEG, q = p * DEG;
  return [Math.sin(a) * Math.cos(q), Math.cos(a) * Math.cos(q), Math.sin(q)];
}
export function azPitchFromDir(d) {
  return [Math.atan2(d[0], d[1]) / DEG, Math.atan2(d[2], Math.hypot(d[0], d[1])) / DEG];
}
// right / up vectors of a view direction with world Z as up
export function viewBasis(dir) {
  const r = norm(cross(dir, [0, 0, 1]));
  return { r, u: cross(r, dir) };
}
// direction offset by (dx, dy) degrees to the right / up of dir
export function offsetDir(dir, dx, dy) {
  const { r, u } = viewBasis(dir);
  return norm(add(dir, add(mul(r, Math.tan(dx * DEG)), mul(u, Math.tan(dy * DEG)))));
}
export function rng(seed) {
  let a = seed >>> 0;
  const f = () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.range = (a2, b2) => a2 + (b2 - a2) * f();
  f.gauss = () => { let u = 0, w = 0; while (u === 0) u = f(); w = f(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * w); };
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  f.sphere = () => { const z = 2 * f() - 1, t = 2 * Math.PI * f(), s = Math.sqrt(1 - z * z); return [s * Math.cos(t), s * Math.sin(t), z]; };
  f.ball = () => mul(f.sphere(), Math.cbrt(f()));
  return f;
}
export function hash3(i, j, k, s = 0) {
  let h = Math.imul(i | 0, 374761393) ^ Math.imul(j | 0, 668265263) ^ Math.imul(k | 0, 2147483647) ^ Math.imul(s | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
// 2D value noise + fbm (for terrain / textures)
export function vnoise2(x, y, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf);
  const a = hash3(xi, yi, 7, s), b = hash3(xi + 1, yi, 7, s), c = hash3(xi, yi + 1, 7, s), d = hash3(xi + 1, yi + 1, 7, s);
  return lerp(lerp(a, b, u), lerp(c, d, u), w);
}
export function fbm2(x, y, oct = 4, s = 0) {
  let v = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { v += a * vnoise2(x * f, y * f, s + i); a *= 0.5; f *= 2.03; }
  return v;
}
