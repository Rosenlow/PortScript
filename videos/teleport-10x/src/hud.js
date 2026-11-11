import * as THREE from 'three';
// Bottom-left: NEXT JUMP + big distance. Centre: small aim dot. Late: HOME marker.
export class Hud {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.cv = document.createElement('canvas'); this.cv.width = w; this.cv.height = h;
    this.ctx = this.cv.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.cv); this.tex.premultiplyAlpha = true; this.tex.colorSpace = THREE.NoColorSpace;
    this.tex.minFilter = this.tex.magFilter = THREE.LinearFilter; this.tex.generateMipmaps = false;
    this.key = '';
  }
  draw(o) {
    const key = JSON.stringify(o); if (key === this.key) return; this.key = key;
    const c = this.ctx, w = this.w, h = this.h; c.clearRect(0, 0, w, h);
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 14;
    // aim dot
    c.fillStyle = 'rgba(255,255,255,0.92)'; c.beginPath(); c.arc(w / 2, h / 2, 3.2, 0, 7); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1; c.shadowBlur = 0; c.beginPath(); c.arc(w / 2, h / 2, 4.2, 0, 7); c.stroke();
    c.shadowBlur = 14;
    // next jump
    const x = 84, y = h - 84;
    c.textBaseline = 'alphabetic'; c.fillStyle = 'rgba(255,255,255,0.78)';
    c.font = '500 23px "Space Grotesk"'; c.letterSpacing = '7px'; c.fillText('NEXT JUMP', x + 2, y - 76);
    c.fillStyle = 'rgba(255,255,255,0.98)'; c.font = '500 68px "Space Grotesk"'; c.letterSpacing = '1px'; c.fillText(o.label, x, y);
    if (o.home) {
      const m = o.home; const a = m.alpha; c.globalAlpha = a; c.letterSpacing = '5px';
      c.strokeStyle = 'rgba(255,255,255,0.95)'; c.fillStyle = 'rgba(255,255,255,0.95)'; c.lineWidth = 2;
      if (!m.behind) {
        c.save(); c.translate(m.x, m.y); c.rotate(Math.PI / 4); c.strokeRect(-9, -9, 18, 18); c.restore();
        c.beginPath(); c.arc(m.x, m.y, 2.2, 0, 7); c.fill();
        c.font = '700 24px "Space Grotesk"'; c.textAlign = 'center'; c.fillText('HOME', m.x + 2, m.y - 30);
        c.font = '500 19px "Space Grotesk"'; c.letterSpacing = '3px'; c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillText(m.dist, m.x + 1, m.y + 46);
      } else {
        // edge indicator: target is behind the player
        c.save(); c.translate(m.x, m.y); c.rotate(m.rot);
        c.beginPath(); c.moveTo(0, 16); c.lineTo(-13, -4); c.lineTo(13, -4); c.closePath(); c.fill(); c.restore();
        c.font = '700 24px "Space Grotesk"'; c.textAlign = 'center';
        const tx = m.x - Math.sin(m.rot) * 0 , ty = m.y - 54;
        c.fillText('HOME', tx + 2, ty); c.font = '500 19px "Space Grotesk"'; c.letterSpacing = '3px'; c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillText(m.dist, tx + 1, ty + 28);
      }
    }
    c.restore();
    this.tex.needsUpdate = true;
  }
}
