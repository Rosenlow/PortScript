import * as THREE from 'three';
import { lerp, clamp, sstep } from './util.js';
// First-person right hand built from capsules. Local frame: +y fingers, +z back of hand, -x thumb side. Units: metres.
const CM = 0.01;
const F = [ // base x, y; segment lengths; radius
  { x: -2.75, y: 9.3, L: [4.3, 2.6, 2.1], r: 0.86 },
  { x: -0.85, y: 9.7, L: [4.7, 3.0, 2.2], r: 0.88 },
  { x: 1.05, y: 9.4, L: [4.3, 2.8, 2.1], r: 0.83 },
  { x: 2.8, y: 8.6, L: [3.4, 2.0, 1.9], r: 0.74 },
];
const POSES = {
  // per finger [prox, mid, dist] curl in degrees; thumb [abduct, pitch, mid, tip]
  relaxed: { f: [[30, 40, 24], [36, 46, 28], [42, 50, 30], [48, 52, 32]], t: [30, -8, 10, 10] },
  ready:   { f: [[50, 78, 44], [70, 88, 52], [76, 92, 54], [80, 92, 54]], t: [15, -10, 6, 8] },
  press:   { f: [[50, 78, 44], [70, 88, 52], [76, 92, 54], [80, 92, 54]], t: [2.5, -15, 19, 24] },
  flat:    { f: [[8, 10, 6], [5, 8, 6], [7, 10, 6], [12, 12, 8]], t: [42, -4, 5, 5] },
};
const M = new THREE.Matrix4(), X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3(), T = new THREE.Vector3();
// orient the hand: fingers along y, and either the thumb side (mode 0) or the back of the hand (mode 1) toward 'ref'
function orient(obj, fy, ref, mode) {
  Y.set(...fy).normalize(); T.set(...ref); T.addScaledVector(Y, -T.dot(Y)).normalize();
  if (mode === 0) { X.copy(T).multiplyScalar(-1); Z.crossVectors(X, Y); } else { Z.copy(T); X.crossVectors(Y, Z); }
  M.makeBasis(X, Y, Z); obj.quaternion.setFromRotationMatrix(M);
}
export class Hand {
  constructor() {
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(48, 16 / 9, 0.02, 5);
    this.key = new THREE.DirectionalLight(0xffffff, 2); this.scene.add(this.key);
    this.fill = new THREE.DirectionalLight(0xffffff, 0.3); this.scene.add(this.fill);
    this.amb = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6); this.scene.add(this.amb);
    const skin = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.78, 0.50, 0.37), roughness: 0.62 });
    const nail = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.86, 0.68, 0.60), roughness: 0.35 });
    const sleeve = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.10, 0.13, 0.20), roughness: 0.95 });
    const root = this.root = new THREE.Group(); this.scene.add(root);
    const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), skin); palm.scale.set(4.5 * CM, 5.3 * CM, 1.55 * CM); palm.position.set(0.1 * CM, 4.9 * CM, 0); root.add(palm);
    const heel = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), skin); heel.scale.set(3.4 * CM, 2.8 * CM, 1.7 * CM); heel.position.set(0, 1.4 * CM, -0.1 * CM); root.add(heel);
    const thenar = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), skin); thenar.scale.set(2.2 * CM, 3.4 * CM, 1.7 * CM); thenar.position.set(-2.6 * CM, 3.6 * CM, -0.7 * CM); thenar.rotation.z = 0.35; root.add(thenar);
    const wrist = new THREE.Mesh(new THREE.CapsuleGeometry(2.7 * CM, 8 * CM, 6, 16), skin); wrist.scale.set(1, 1, 0.72); wrist.position.set(0, -4 * CM, 0); root.add(wrist);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(3.5 * CM, 4.6 * CM, 34 * CM, 20, 1), sleeve); cuff.scale.set(1, 1, 0.8); cuff.position.set(0, -22.5 * CM, 0); root.add(cuff);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(3.45 * CM, 0.5 * CM, 8, 20), sleeve); rim.rotation.x = Math.PI / 2; rim.scale.set(1, 0.8, 1); rim.position.set(0, -5.6 * CM, 0); root.add(rim);
    const seg = (r, L, parent, mat = skin) => { const g = new THREE.Group(); parent.add(g); const m = new THREE.Mesh(new THREE.CapsuleGeometry(r * CM, L * CM, 5, 12), mat); m.position.y = L * CM / 2; g.add(m); return g; };
    this.fingers = F.map((f, i) => {
      const a = seg(f.r, f.L[0], root); a.position.set(f.x * CM, f.y * CM, 0); a.rotation.z = -(f.x) * 0.035;
      const b = seg(f.r * 0.93, f.L[1], a); b.position.y = f.L[0] * CM;
      const c = seg(f.r * 0.86, f.L[2], b); c.position.y = f.L[1] * CM;
      const n = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), nail); n.scale.set(f.r * 0.72 * CM, 0.85 * CM, 0.25 * CM); n.position.set(0, f.L[2] * 0.62 * CM, f.r * 0.72 * CM); c.add(n);
      return [a, b, c];
    });
    const t0 = new THREE.Group(); t0.position.set(-3.5 * CM, 2.6 * CM, -0.9 * CM); root.add(t0);
    const ta = seg(1.12, 4.0, t0), tb = seg(1.0, 3.3, ta), tc = seg(0.92, 2.6, tb); tb.position.y = 4.0 * CM; tc.position.y = 3.3 * CM;
    const tn = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), nail); tn.scale.set(0.72 * CM, 0.95 * CM, 0.25 * CM); tn.position.set(0, 1.6 * CM, 0.74 * CM); tc.add(tn);
    this.thumb = [t0, ta, tb, tc];
    this.pose('relaxed', 'relaxed', 0);
  }
  pose(A, B, k) {
    const a = POSES[A], b = POSES[B], D = Math.PI / 180;
    this.fingers.forEach((s, i) => s.forEach((g, j) => { g.rotation.x = -lerp(a.f[i][j], b.f[i][j], k) * D; }));
    const t = a.t.map((v, i) => lerp(v, b.t[i], k));
    this.thumb[0].rotation.order = 'ZXY'; this.thumb[0].rotation.set(t[1] * D, -0.9, t[0] * D);
    this.thumb[2].rotation.x = -t[2] * D; this.thumb[3].rotation.x = -t[3] * D;
  }
  // state: {raise 0..1, press 0..1, reach 0..1, tremble}
  update(s, t) {
    const up = s.raise, re = s.reach;
    this.root.visible = up > 0.001 || re > 0.001;
    if (re > 0.001) {
      this.pose('relaxed', 'flat', sstep(0.2, 0.9, re));
      const k = sstep(0, 1, re), st = Math.sin(t * 1.9) * k;
      this.root.position.set(lerp(0.30, 0.075, k) + 0.012 * st, lerp(-0.62, -0.215, k) + 0.01 * st, lerp(-0.42, -0.60, k));
      orient(this.root, [lerp(-0.5, -0.16, k), 0.92, -0.45], [0.05, 0.25, 1], 1);
    } else {
      this.pose(s.press > 0 ? 'ready' : 'relaxed', s.press > 0 ? 'press' : 'ready', s.press > 0 ? s.press : sstep(0.3, 1, up));
      const k = sstep(0, 1, up), tr = (s.tremble || 0);
      this.root.position.set(lerp(0.36, 0.17, k) + tr * 0.0012 * Math.sin(t * 31), lerp(-0.56, -0.20, k) + 0.004 * Math.sin(t * 1.4) + tr * 0.0015 * Math.sin(t * 27 + 1) - 0.005 * s.press, -0.50);
      orient(this.root, [-0.46, 0.50, -0.73], [0.25, 1, 0.35], 0);
    }
  }
  render(renderer, rt, light) {
    this.key.position.copy(light.dir); this.key.color.copy(light.color); this.key.intensity = light.key;
    this.fill.position.set(-light.dir.x, 0.3, -light.dir.z + 0.5); this.fill.color.copy(light.fillColor || light.sky); this.fill.intensity = light.fill ?? 0.25;
    this.amb.color.copy(light.sky); this.amb.groundColor.copy(light.ground); this.amb.intensity = light.amb;
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(this.scene, this.cam); renderer.setClearColor(0x000000, 1);
  }
}
