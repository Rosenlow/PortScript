// Timeline: 28 jumps, camera keyframes, stop positions. Everything is derived from the camera
// direction at the moment of each jump, so "aim, press, land 10x farther" is literally what is rendered.
import { DEG, LY, add, sub, mul, dot, cross, len, norm, lerp, clamp, sstep, dirFromAzPitch, azPitchFromDir, offsetDir, viewBasis, angleBetween } from './util.js';
import { pickVoid } from './web.js';

export const FPS = 30, DURATION = 600;
export const JUMP_T = [11, 29, 52, 70, 113, 141, 186, 211, 234, 261, 287, 308, 345, 363, 381, 402, 412, 424, 437, 466, 486, 506, 533, 551, 565, 580, 585, 596];
export const JUMP_D = JUMP_T.map((_, i) => Math.pow(10, i));   // metres: 1 m ... 1e27 m
export const LABELS = ['1 M', '10 M', '100 M', '1 KM', '10 KM', '100 KM', '1,000 KM', '10,000 KM', '100,000 KM',
  '1 MILLION KM', '10 MILLION KM', '100 MILLION KM', '1 BILLION KM', '10 BILLION KM', '100 BILLION KM',
  '0.106 LY', '1.06 LY', '10.6 LY', '106 LY', '1,060 LY', '10,600 LY', '106,000 LY',
  '1.06 MILLION LY', '10.6 MILLION LY', '106 MILLION LY', '1.06 BILLION LY', '10.6 BILLION LY', '106 BILLION LY', '1.06 TRILLION LY'];

// ---------- fixed world facts (ENU metres, origin = ground under the salon at sea level) ----------
const R_EARTH = 6371e3;
const W = {
  R_EARTH, lat: 41.031, lon: 28.983,
  P0: [-1.5, -0.2, 62.6],                          // eye in the salon
  scarf: [3.0, 1.72, 62.12],                         // red scarf on the balcony rail
  sofaTouch: [-1.05, 1.52, 61.5],
  earthC: [0, 0, -R_EARTH],
  sunDir: dirFromAzPitch(100, 14),
  moonDir: dirFromAzPitch(160, 45),
  AU: 1.496e11,
  galN: dirFromAzPitch(300, 25),                   // galactic north pole in ENU
  sunGal: [-26, 0, 0.06],                          // Sun in galactic coords, kly (centre at origin, +x_g = Sun→centre)
};
W.sun = mul(W.sunDir, W.AU);
W.moon = add(W.earthC, mul(W.moonDir, 3.844e8));
{ // galactic basis: gx toward the centre (perpendicular to galN), gz = pole
  const c0 = dirFromAzPitch(205, 20);
  W.galX = norm(sub(c0, mul(W.galN, dot(c0, W.galN))));
  W.galY = cross(W.galN, W.galX);
  W.galC = add(W.sun, mul(W.galX, 26e3 * LY));
}
export const toGal = (P) => { const r = mul(sub(P, W.sun), 1 / (1e3 * LY)); return [W.sunGal[0] + dot(r, W.galX), W.sunGal[1] + dot(r, W.galY), W.sunGal[2] + dot(r, W.galN)]; };
export const galDirToENU = (g) => add(add(mul(W.galX, g[0]), mul(W.galY, g[1])), mul(W.galN, g[2]));
export const fromGal = (g) => add(W.sun, mul(galDirToENU(sub(g, W.sunGal)), 1e3 * LY));
const lb = (l, b) => [Math.cos(b * DEG) * Math.cos(l * DEG), Math.cos(b * DEG) * Math.sin(l * DEG), Math.sin(b * DEG)];
// Local Group (positions in galactic kly)
W.localGroup = [
  { name: 'LMC', g: add(W.sunGal, mul(lb(280.5, -32.9), 163)), diam: 16, type: 2, seed: 3 },
  { name: 'SMC', g: add(W.sunGal, mul(lb(302.8, -44.3), 200)), diam: 9, type: 2, seed: 5 },
  { name: 'M31', g: add(W.sunGal, mul(lb(121.2, -21.6), 2500)), diam: 190, type: 0, seed: 11, nrm: norm([0.55, -0.35, 0.76]) },
  { name: 'M33', g: add(W.sunGal, mul(lb(133.6, -31.3), 2730)), diam: 62, type: 0, seed: 17, nrm: norm([-0.3, 0.6, 0.74]) },
];

const OUT = { az: 440, p: 62 };          // "straight out" heading used for jumps 7-9
const TRI = { az: 372, p: 18 };          // heading of the three reference stars (set after stop 15)
// ---------- camera keys ----------
// spec: {az,p} absolute | {aim: point | (ctx)=>point, off:[dx,dy]} | {dir:(ctx)=>dir} | {hold:true}; turn: 'cw'|'ccw' forces sense
const earth = () => W.earthC, sun = () => W.sun;
const antiSun = (c) => add(c.P, sub(c.P, W.sun));
const gdir = (g) => (c) => add(c.P, mul(galDirToENU(norm(g)), 1e30));
const KEYS = [
  [0, { az: 70, p: -3 }], [3.5, { hold: 1 }], [8, { az: 15, p: -2 }],
  /* J1 11 */ [12.5, { hold: 1 }], [15, { aim: () => W.sofaTouch }], [20.5, { hold: 1 }], [25.5, { aim: () => W.P2aim }],
  /* J2 29 */ [31.5, { hold: 1 }], [37.5, { az: 271, p: 7.5 }], [43, { az: 268, p: 6 }], [48.5, { aim: () => W.P3aim, turn: 'cw' }],
  /* J3 52 */ [54, { hold: 1 }], [60.5, { aim: () => W.scarf, turn: 'cw' }],
  /* J4 70 */ [72.5, { hold: 1 }], [75, { daz: -7, dp: -3 }], [83, { az: 371, p: 3 }], [88, { az: 364, p: 4.6 }], [93, { az: 379, p: 2.4 }], [98.5, { aim: () => W.scarf, off: [1.5, 0.8] }], [100.5, { hold: 1 }], [107.5, { az: 440, p: 1.15 }],
  /* J5 113 */ [117, { hold: 1 }], [134.5, { az: 444, p: 79 }],
  /* J6 141 */ [144.5, { hold: 1 }], [153, { az: 607, p: -43 }], [176, { az: 600, p: -39 }], [183, { az: OUT.az, p: OUT.p }],
  /* J7 186 */ [188.5, { hold: 1 }], [195, { aim: earth, off: [0, 24] }], [203, { aim: earth, off: [14, 30] }], [209.5, OUT],
  /* J8 211 */ [213, { hold: 1 }], [219, { aim: earth, off: [0, 3] }], [223, { aim: earth, off: [3, 11] }], [227.5, { aim: earth, off: [-3, -9] }], [232.5, OUT],
  /* J9 234 */ [236, { hold: 1 }], [241.5, { aim: earth }], [250, { aim: earth, off: [2, 1] }], [257.5, { aim: () => W.moon }],
  /* J10 261 */ [263, { hold: 1 }], [269.5, { dir: (c) => norm(add(norm(sub(W.earthC, c.P)), norm(sub(W.moon, c.P)))) }], [279, { hold: 1 }], [284.5, { dir: () => W.fwd10 }],
  /* J11 287 */ [289, { hold: 1 }], [294.5, { aim: earth }], [301, { hold: 1 }], [305.5, { dir: () => W.fwd10 }],
  /* J12 308 */ [310, { hold: 1 }], [315.5, { aim: earth, off: [-2, 1] }], [319, { aim: earth, off: [5, 2] }], [322.5, { aim: earth, off: [-6, -3] }], [326, { aim: earth, off: [1, 0] }],
  [333, { aim: sun }], [336.5, { hold: 1 }], [342.5, { aim: antiSun }],
  /* J13 345 */ [347, { hold: 1 }], [351, { aim: sun, turn: 'cw' }], [354.5, { hold: 1 }], [359.5, { aim: antiSun, turn: 'ccw' }],
  /* J14 363 */ [365, { hold: 1 }], [369, { aim: sun, turn: 'cw' }], [372, { hold: 1 }], [377, { aim: antiSun, turn: 'ccw' }],
  /* J15 381 */ [389, { hold: 1 }], [392.5, { aim: sun, turn: 'cw' }], [394.5, { hold: 1 }], [399.5, { dir: () => W.triDir }],
  /* J16 402, J17 412, J18 424, J19 437 */ [439.5, { hold: 1 }], [446, { dir: () => offsetDir(mul(W.triDir, -1), 0, 3) }], [450, { dir: () => offsetDir(mul(W.triDir, -1), 9, -4) }], [453.5, { dir: () => offsetDir(mul(W.triDir, -1), -7, 5) }],
  [459.5, { aim: gdir([0.5, -0.86, 0.02]) }], [461.5, { hold: 1 }], [464.5, { aim: gdir([0, 0, 1]) }],
  /* J20 466 */ [468, { hold: 1 }], [474, { aim: () => W.galC, off: [0, 4] }], [480, { hold: 1 }], [484.5, { aim: gdir([0, 0, 1]) }],
  /* J21 486 */ [488, { hold: 1 }], [494, { aim: () => W.galC, off: [0, 3] }], [500, { hold: 1 }], [504.5, { aim: gdir([0, 0, 1]) }],
  /* J22 506 */ [510, { hold: 1 }], [521, { aim: () => W.galC, off: [-3, 1] }], [527, { aim: () => W.galC, off: [-1, 0] }], [531.5, { dir: () => W.dir23 }],
  /* J23 533 */ [535, { hold: 1 }], [540.5, { aim: () => W.galC, off: [5, 2] }], [546, { hold: 1 }], [549.5, { dir: () => W.dir24 }],
  /* J24 551 */ [553, { hold: 1 }], [560, { aim: () => W.trioC }],
  /* J25 565 */ [568, { hold: 1 }], [574, { daz: 4, dp: 1.5 }], [578.6, { aim: () => W.void1 }],
  /* J26 580 */ [581, { hold: 1 }], [584.2, { aim: () => W.void2 }],
  /* J27 585 */ [586.6, { hold: 1 }], [591.5, { aim: () => [0, 0, 0] }],
  /* J28 596 */ [600, { hold: 1 }],
];

// things that only exist once a stop is known
const AFTER = {
  1: (c) => { W.P2aim = add(c.P, mul(dirFromAzPitch(91, -9.21), 10)); },
  2: (c) => { W.P3aim = add(c.P, mul(dirFromAzPitch(8, 3.27), 100)); },
  10: (c) => { W.fwd10 = norm(sub(c.P, c.prev)); },
  15: (c) => {
    W.triDir = dirFromAzPitch(TRI.az, TRI.p);
    const mk = (dx, dy, d, mag, col) => ({ pos: add(c.P, mul(offsetDir(W.triDir, dx, dy), d * LY)), d, mag, col });
    W.tri = [mk(-4.2, -2.4, 13.5, -0.3, [0.75, 0.85, 1.0]), mk(4.6, -1.6, 43, 0.0, [1.0, 0.72, 0.45]), mk(0.4, 4.4, 98, 0.1, [1.0, 0.95, 0.8])];
  },
  22: (c) => { // away from Andromeda, tilted, so that looking back shows the Milky Way with M31 beyond it
    const m31 = fromGal(W.localGroup[2].g); const away = norm(sub(c.P, m31));
    W.dir23 = offsetDir(away, 16, 9);
  },
  23: (c) => { W.dir24 = offsetDir(W.dir23, 38, -12); },
  24: (c) => { // three galaxies ~106 Mly ahead: where the player will land among them
    const d = offsetDir(W.dir24, -31, 9); const L = 1e6 * LY;
    W.trioDir = d; W.trioC = add(c.P, mul(d, 106.62 * L));
    const land = add(c.P, mul(d, 106 * L));
    const at = (dx, dy, dist) => add(land, mul(offsetDir(d, dx, dy), dist * L));
    W.trio = [
      { name: 'spiral', pos: at(-14.5, -4.5, 0.34), diam: 150, type: 0, seed: 23, nrm: norm(add(mul(d, -0.72), add(mul(viewBasis(d).u, 0.62), mul(viewBasis(d).r, 0.3)))) },
      { name: 'edge', pos: at(15, 5.5, 0.52), diam: 170, type: 3, seed: 31, nrm: norm(add(mul(viewBasis(d).u, 0.93), mul(viewBasis(d).r, 0.36))) },
      { name: 'elliptical', pos: at(2.5, 12.0, 0.44), diam: 110, type: 1, seed: 37, nrm: norm([0.3, 0.5, 0.8]) },
    ];
  },
  25: (c) => { W.void1 = mul(pickVoid(mul(c.P, 1 / (1e6 * LY)), c.dir), 1e6 * LY); },
  26: (c) => { W.void2 = mul(pickVoid(mul(c.P, 1 / (1e6 * LY)), c.dir, 0.55), 1e6 * LY); },
};

function unwrapNear(az, ref, turn) {
  let a = az + 360 * Math.round((ref - az) / 360);
  if (turn === 'cw' && a < ref - 1e-6) a += 360;
  if (turn === 'ccw' && a > ref + 1e-6) a -= 360;
  return a;
}

export function buildTimeline() {
  const P = [W.P0.slice()]; const keys = []; const jumpDir = [];
  let stop = 0, cur = null, ki = 0;
  const resolve = (t, s) => {
    const c = { P: P[stop], stop, W };
    let az, p;
    if (s.hold) { az = cur.az; p = cur.p; }
    else if (s.daz !== undefined) { az = cur.az + s.daz; p = cur.p + s.dp; }
    else if (s.az !== undefined) { az = s.az; p = s.p; }
    else {
      let d = s.dir ? s.dir(c) : norm(sub(typeof s.aim === 'function' ? s.aim(c) : s.aim, c.P));
      if (s.off) d = offsetDir(d, s.off[0], s.off[1]);
      const ap = azPitchFromDir(d); az = unwrapNear(ap[0], cur ? cur.az : 0, s.turn); p = ap[1];
    }
    cur = { t, az, p }; keys.push(cur);
  };
  for (let j = 0; j <= JUMP_T.length; j++) {
    const tj = j < JUMP_T.length ? JUMP_T[j] : Infinity;
    while (ki < KEYS.length && KEYS[ki][0] < tj) { resolve(KEYS[ki][0], KEYS[ki][1]); ki++; }
    if (j === JUMP_T.length) break;
    keys.push(cur = { t: tj, az: cur.az, p: cur.p, jump: j + 1 });       // camera is at rest when the thumb presses
    const d = dirFromAzPitch(cur.az, cur.p); jumpDir.push(d);
    P.push(add(P[stop], mul(d, JUMP_D[j]))); stop++;
    if (AFTER[stop]) AFTER[stop]({ P: P[stop], prev: P[stop - 1], dir: d, stop, W });
  }
  const orientAt = (t) => {
    let i = 0; while (i < keys.length - 2 && keys[i + 1].t <= t) i++;
    const a = keys[i], b = keys[i + 1]; const u = clamp((t - a.t) / Math.max(1e-6, b.t - a.t)); const e = u * u * (3 - 2 * u);
    return { az: lerp(a.az, b.az, e), p: lerp(a.p, b.p, e) };
  };
  const stopAt = (t) => { let s = 0; while (s < JUMP_T.length && t >= JUMP_T[s] - 1e-9) s++; return s; };
  // hand-held sway: deterministic, tiny
  const sway = (t, k = 1) => ({
    az: k * (0.22 * Math.sin(0.61 * t + 1.3) + 0.11 * Math.sin(1.73 * t + 0.4) + 0.05 * Math.sin(4.1 * t)),
    p: k * (0.16 * Math.sin(0.83 * t + 2.1) + 0.09 * Math.sin(2.21 * t + 1.1) + 0.2 * Math.sin(2 * Math.PI * t / 4.4)),
    roll: k * (0.25 * Math.sin(0.47 * t + 0.7) + 0.1 * Math.sin(1.31 * t)),
  });
  return { P, keys, jumpDir, orientAt, stopAt, sway, W };
}
export { W as WORLD };
