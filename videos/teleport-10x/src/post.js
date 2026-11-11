import * as THREE from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// HDR scene target -> bloom -> exposure / filmic curve / grain -> HUD on top.
export class Post {
  constructor(renderer, w, h, samples = 0) {
    this.r = renderer; this.w = w; this.h = h;
    this.rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples, depthBuffer: true });
    this.bloom = new UnrealBloomPass(new THREE.Vector2(w / 2, h / 2), 0.5, 0.6, 1.0);
    this.handRT = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4, depthBuffer: true });
    this.mat = new THREE.ShaderMaterial({
      depthTest: false, depthWrite: false,
      uniforms: { tScene: { value: this.rt.texture }, tHud: { value: null }, tHand: { value: this.handRT.texture }, uHand: { value: 0 }, uHandExp: { value: 1 }, uExposure: { value: 1 }, uFlash: { value: 0 }, uSeed: { value: 0 }, uVig: { value: 0.25 }, uGrain: { value: 0.018 }, uSat: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }',
      fragmentShader: `
        varying vec2 vUv; uniform sampler2D tScene, tHud, tHand; uniform float uExposure, uFlash, uSeed, uVig, uGrain, uSat, uHand, uHandExp;
        vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.,1.); }
        float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233))+uSeed)*43758.5453); }
        void main(){
          vec3 c = texture2D(tScene, vUv).rgb * uExposure;
          if (uHand > 0.5) { vec4 hd = texture2D(tHand, vUv); c = c*(1.0-hd.a) + hd.rgb*uHandExp*uExposure; }
          c *= (1.0 + 2.2*uFlash);
          c = aces(c*0.72);
          float l = dot(c, vec3(0.299,0.587,0.114)); c = mix(vec3(l), c, uSat);
          c = pow(c, vec3(1.0/2.2));
          vec2 q = vUv-0.5; c *= 1.0 - uVig*dot(q,q)*1.6;
          c = mix(c, vec3(1.0), uFlash*0.42);
          float g = (h(gl_FragCoord.xy)+h(gl_FragCoord.xy+17.3)-1.0);
          c += g*uGrain;
          vec4 hud = texture2D(tHud, vUv);
          c = c*(1.0-hud.a) + hud.rgb;      // premultiplied
          gl_FragColor = vec4(c,1.0);
        }`,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat); this.quad.frustumCulled = false;
    this.scene = new THREE.Scene(); this.scene.add(this.quad); this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  finish(o) {
    const r = this.r;
    if (o.bloom > 0.001) { this.bloom.strength = o.bloom; this.bloom.threshold = o.threshold; this.bloom.radius = o.radius ?? 0.55; this.bloom.render(r, null, this.rt, 0, false); }
    const u = this.mat.uniforms; u.tScene.value = this.rt.texture; u.tHud.value = o.hud; u.uExposure.value = o.exposure; u.uFlash.value = o.flash; u.uSeed.value = o.seed; u.uVig.value = o.vig ?? 0.25; u.uGrain.value = o.grain ?? 0.018; u.uHand.value = o.hand ? 1 : 0; u.uHandExp.value = o.handExp ?? 1;
    r.setRenderTarget(null); r.render(this.scene, this.cam);
  }
}
