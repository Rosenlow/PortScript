import * as THREE from 'three';
// The player never walks: between jumps the camera only turns. So the static world of each stop is rendered once
// into a 6-face HDR panorama (colour + linear depth) and every video frame resamples it; moving things are drawn
// on top and depth-tested against the baked depth.
const FACES = [ // forward, up
  [[1, 0, 0], [0, 0, 1]], [[-1, 0, 0], [0, 0, 1]], [[0, 1, 0], [0, 0, 1]], [[0, -1, 0], [0, 0, 1]], [[0, 0, 1], [0, 1, 0]], [[0, 0, -1], [0, 1, 0]],
];
export class Pano {
  constructor(renderer, size = 2560) {
    this.r = renderer; this.size = size;
    this.work = new THREE.WebGLRenderTarget(size, size, { type: THREE.HalfFloatType, samples: 4, depthTexture: new THREE.DepthTexture(size, size, THREE.UnsignedIntType) });
    this.faces = FACES.map(() => { const t = new THREE.WebGLRenderTarget(size, size, { type: THREE.HalfFloatType, depthBuffer: false }); t.texture.minFilter = t.texture.magFilter = THREE.LinearFilter; t.texture.generateMipmaps = false; return t; });
    this.cam = new THREE.PerspectiveCamera(90, 1, 0.1, 1000);
    this.copy = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, uniforms: { tC: { value: this.work.texture }, tD: { value: this.work.depthTexture }, nf: { value: new THREE.Vector2() } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }',
      fragmentShader: 'varying vec2 vUv; uniform sampler2D tC, tD; uniform vec2 nf; void main(){ float d = texture2D(tD, vUv).r; float z = 2.0*d-1.0; float ze = 2.0*nf.x*nf.y/(nf.y+nf.x - z*(nf.y-nf.x)); if (d >= 0.9999999) ze = 6.0e4; gl_FragColor = vec4(texture2D(tC, vUv).rgb, min(ze, 6.0e4)); }' });
    this.fs = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.copy); this.fs.frustumCulled = false; this.fsScene = new THREE.Scene(); this.fsScene.add(this.fs); this.ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = new THREE.Scene(); this.group = new THREE.Group(); this.scene.add(this.group);
    this.mats = FACES.map(([f, u], i) => {
      const F = new THREE.Vector3(...f), U = new THREE.Vector3(...u), R = new THREE.Vector3().crossVectors(F, U);
      const m = new THREE.ShaderMaterial({ depthTest: true, depthFunc: THREE.AlwaysDepth, depthWrite: true,
        uniforms: { tex: { value: this.faces[i].texture }, F: { value: F }, U: { value: U }, R: { value: R }, S: { value: 1 }, gain: { value: 1 }, unit: { value: 1 } },
        vertexShader: 'uniform vec3 F, U, R; uniform float S; varying vec2 vUv; varying vec3 vDir; void main(){ vUv = uv; vDir = F + R*position.x + U*position.y; gl_Position = projectionMatrix * viewMatrix * vec4(cameraPosition + vDir*S, 1.0); }',
        fragmentShader: 'uniform mat4 projectionMatrix; uniform sampler2D tex; uniform float gain, unit; varying vec2 vUv; varying vec3 vDir; void main(){ vec4 c = texture2D(tex, vUv); gl_FragColor = vec4(c.rgb*gain, 1.0); if (c.a >= 5.9e4) { gl_FragDepth = 1.0; } else { vec4 cl = projectionMatrix * viewMatrix * vec4(cameraPosition + vDir*c.a*unit, 1.0); gl_FragDepth = clamp(cl.z/cl.w*0.5+0.5, 0.0, 1.0); } }' });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m); mesh.frustumCulled = false; this.group.add(mesh); return m;
    });
    this.key = null;
  }
  // draw(cam, target): render the static world with the given camera into target
  bake(key, pos, near, far, draw) {
    if (this.key === key) return false; this.key = key; const r = this.r, c = this.cam;
    c.near = near; c.far = far; c.updateProjectionMatrix();
    FACES.forEach(([f, u], i) => {
      c.position.set(pos[0], pos[1], pos[2]); c.up.set(...u); c.lookAt(pos[0] + f[0], pos[1] + f[1], pos[2] + f[2]); c.updateMatrixWorld();
      draw(c, this.work);
      this.copy.uniforms.nf.value.set(near, far); r.setRenderTarget(this.faces[i]); r.render(this.fsScene, this.ortho);
    });
    r.setRenderTarget(null); return true;
  }
  draw(rt, camera, gain = 1, clear = true) {
    const r = this.r, S = Math.sqrt(camera.near * camera.far) ; for (const m of this.mats) { m.uniforms.S.value = S; m.uniforms.gain.value = gain; }
    r.setRenderTarget(rt); if (clear) { r.setClearColor(0x000000, 1); r.clear(); } const ac = r.autoClear; r.autoClear = false; r.render(this.scene, camera); r.autoClear = ac;
  }
}
