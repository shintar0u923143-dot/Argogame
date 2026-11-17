/* ARGOPOWER Hover-Rig: the player's 3D ship, built entirely in code (no model files, fully owned).
   Rendered live with three.js into a small transparent canvas that the 2D game draws every frame.
   window.RIG = { draw(ctx, x, y, size, state) }  — state: {sex, tilt, fire, weapon, boost, mode, hit, dt} */
import * as THREE from './three.module.min.js';
import { RoomEnvironment } from './RoomEnvironment.js';

/* vertical fade used by the thruster flames (bright at the nozzle, gone at the tip) */
function gradTex() { const c = document.createElement('canvas'); c.width = 4; c.height = 64; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.55, 'rgba(160,160,160,1)'); g.addColorStop(1, 'rgba(255,255,255,1)'); x.fillStyle = g; x.fillRect(0, 0, 4, 64); return new THREE.CanvasTexture(c); }
function dotTex() { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); }
const RED = 0xe1251b, BLACK = 0x1b1b20, YEL = 0xf5b800, STEEL = 0xc9ced6, SKIN = 0xf1c27d;
const PX = 256;                                   // render resolution (square)
const cv = document.createElement('canvas'); cv.width = cv.height = PX;
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, premultipliedAlpha: false, preserveDrawingBuffer: true }); }
catch (e) { renderer = null; }

const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
cam.position.set(0, -8.2, 7.6); cam.lookAt(0, 0.1, 0);     // high-angle view from behind the rig
if (renderer) {
  renderer.setPixelRatio(1); renderer.setSize(PX, PX, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
}
const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-3, -2, 8); scene.add(key);
const rim = new THREE.DirectionalLight(0xffd9a0, 1.4); rim.position.set(4, 6, 3); scene.add(rim);

/* ---------- materials ---------- */
const M = {
  red: new THREE.MeshStandardMaterial({ color: RED, roughness: .32, metalness: .15 }),
  black: new THREE.MeshStandardMaterial({ color: BLACK, roughness: .45, metalness: .3 }),
  yel: new THREE.MeshStandardMaterial({ color: YEL, roughness: .3, metalness: .2 }),
  steel: new THREE.MeshStandardMaterial({ color: STEEL, roughness: .18, metalness: .95 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x66d9ff, roughness: .05, metalness: .2, emissive: 0x1a6aa0, emissiveIntensity: .6 }),
  skin: new THREE.MeshStandardMaterial({ color: SKIN, roughness: .6 }),
  hair: new THREE.MeshStandardMaterial({ color: 0x5a2f14, roughness: .7 }),
  glow: new THREE.MeshBasicMaterial({ color: 0xff8a20, map: gradTex(), transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  glowCore: new THREE.MeshBasicMaterial({ color: 0xfff0b0, map: gradTex(), transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  led: new THREE.MeshBasicMaterial({ color: 0x3cff6a }),
  ledOff: new THREE.MeshBasicMaterial({ color: 0x23302a }),
  strip: new THREE.MeshBasicMaterial({ color: 0xffd21f }),
  heat: new THREE.MeshStandardMaterial({ color: 0x331008, emissive: 0xff4a10, emissiveIntensity: 1.2, roughness: .4 })
};
/* cartoon ink outline (inverted hull pushed out along normals) to match the game's thick-outline art style */
const INK = new THREE.ShaderMaterial({
  side: THREE.BackSide, uniforms: { w: { value: .045 } },
  vertexShader: 'uniform float w; void main(){ vec3 p = position + normal * w; gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0); }',
  fragmentShader: 'void main(){ gl_FragColor = vec4(0.06,0.05,0.07,1.0); }'
});
const flashables = [];
function part(geo, mat, parent, pos, rot, ink = true) {
  const m = new THREE.Mesh(geo, mat); if (pos) m.position.set(...pos); if (rot) m.rotation.set(...rot);
  parent.add(m);
  if (ink) { const o = new THREE.Mesh(geo, INK); m.add(o); }
  if (mat !== M.glow && mat !== M.glowCore) flashables.push(m);
  return m;
}
function roundBox(w, h, d, r) {   // rounded box via extruded rounded rectangle
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - r * 2, bevelEnabled: true, bevelThickness: r, bevelSize: r * .9, bevelSegments: 3, curveSegments: 6 });
  g.translate(0, 0, -(d - r * 2) / 2); g.computeVertexNormals(); return g;
}
/* logo plate texture */
function logoTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#17171b'; x.fillRect(0, 0, 256, 64); x.fillStyle = '#f5b800'; x.font = 'bold 40px Oswald, Arial Narrow, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('ARGOPOWER', 128, 34); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

/* ---------- the rig (nose points +Y, up the screen) ---------- */
const root = new THREE.Group(); scene.add(root);
const body = new THREE.Group(); root.add(body);
// battery-pack hull
part(roundBox(1.25, 2.1, .62, .16), M.red, body, [0, -.25, 0]);
part(roundBox(1.32, .55, .7, .12), M.black, body, [0, -1.05, 0]);                           // battery latch block
part(new THREE.BoxGeometry(1.33, .09, .5), M.yel, body, [0, -.72, 0], null, false);           // yellow stripe
const plate = part(new THREE.PlaneGeometry(1.0, .25), new THREE.MeshStandardMaterial({ map: logoTex(), roughness: .4 }), body, [0, -1.05, .36], null, false);
// motor housing + chuck (nose)
part(new THREE.CylinderGeometry(.42, .5, 1.1, 24), M.black, body, [0, 1.2, .05]);
const nose = new THREE.Group(); nose.position.set(0, 1.72, .05); body.add(nose);
const chuck = part(new THREE.CylinderGeometry(.27, .36, .42, 20), M.steel, nose, [0, .2, 0]);
const W = {};   // weapon heads
W.drill = new THREE.Group(); nose.add(W.drill);
{ const bitGeo = new THREE.ConeGeometry(.17, 1.0, 6, 6); const bit = part(bitGeo, M.steel, W.drill, [0, .9, 0]); W.drill.bit = bit;
  for (let i = 0; i < 4; i++) { const r = part(new THREE.TorusGeometry(.13 - i * .025, .028, 6, 16), M.black, bit, [0, -.3 + i * .18, 0], [Math.PI / 2, 0, 0], false); r.scale.set(1, 1, .6); } }
W.nail = new THREE.Group(); nose.add(W.nail);
for (const sx of [-1, 1]) { const b = part(new THREE.BoxGeometry(.2, .75, .22), M.black, W.nail, [sx * .17, .72, 0]); part(new THREE.CylinderGeometry(.06, .06, .3, 10), M.steel, b, [0, .48, 0]); }
part(new THREE.BoxGeometry(.5, .28, .3), M.yel, W.nail, [0, .42, 0]);
W.heat = new THREE.Group(); nose.add(W.heat);
part(new THREE.CylinderGeometry(.34, .24, .55, 20), M.black, W.heat, [0, .6, 0]);
W.heat.core = part(new THREE.CylinderGeometry(.22, .22, .08, 20), M.heat, W.heat, [0, .9, 0], null, false);
W.disc = new THREE.Group(); nose.add(W.disc);
part(new THREE.BoxGeometry(.3, .5, .25), M.black, W.disc, [0, .5, 0]);
W.disc.blade = part(new THREE.CylinderGeometry(.55, .55, .05, 28), M.steel, W.disc, [0, .85, .08], [Math.PI / 2, 0, 0]);
part(new THREE.CylinderGeometry(.14, .14, .08, 12), M.yel, W.disc.blade, [0, .02, 0], null, false);
// wings + side thrusters
const wingShape = new THREE.Shape(); wingShape.moveTo(0, .55); wingShape.lineTo(1.55, -.35); wingShape.lineTo(1.6, -.8); wingShape.lineTo(.9, -.6); wingShape.lineTo(0, -.6);
const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: .14, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 2 }); wingGeo.translate(0, 0, -.07);
const flames = [], DOT = dotTex();
function flame(parent, pos, r, len) {
  const f = new THREE.Group(); f.position.set(...pos); parent.add(f);
  part(new THREE.ConeGeometry(r, len, 16, 1, true), M.glow, f, [0, -len / 2, 0], [Math.PI, 0, 0], false);
  part(new THREE.ConeGeometry(r * .5, len * .62, 12, 1, true), M.glowCore, f, [0, -len * .31, 0], [Math.PI, 0, 0], false);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: DOT, color: 0xffa040, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  sp.scale.set(r * 5, r * 5, 1); sp.position.set(0, -.05, .05); f.add(sp); f.sp = sp; flames.push(f); return f;
}
for (const sx of [-1, 1]) {
  const w = part(wingGeo, M.black, body, [sx * .55, -.15, -.05]); w.scale.x = sx;
  part(new THREE.BoxGeometry(.18, .55, .2), M.yel, body, [sx * 2.12, -.65, -.05], [0, 0, sx * .35]);       // wing tips
  const pod = part(new THREE.CylinderGeometry(.26, .3, 1.1, 18), M.red, body, [sx * 1.15, -.6, -.02]);
  part(new THREE.CylinderGeometry(.3, .22, .22, 18), M.black, pod, [0, -.62, 0]);                                // nozzle
  flame(body, [sx * 1.15, -1.25, -.02], .22, 1.0);
  part(new THREE.BoxGeometry(.06, .7, .04), M.strip, pod, [sx * .2, .05, .22], null, false);                       // light strip
}
// main thruster under the battery
flame(body, [0, -1.36, -.05], .3, 1.35);
// battery charge LEDs (light up with the Shock meter)
const leds = []; for (let i = 0; i < 5; i++) leds.push(part(new THREE.BoxGeometry(.13, .07, .04), M.ledOff, body, [-.32 + i * .16, -.78, .37], null, false));

/* ---------- pilot (sits on top of the hull, seen from behind) ---------- */
const pilot = new THREE.Group(); pilot.position.set(0, -.62, .3); pilot.scale.setScalar(.92); body.add(pilot);
const torso = part(new THREE.CapsuleGeometry(.3, .35, 6, 14), M.black, pilot, [0, .05, .42], [1.15, 0, 0]);   // torso leaning forward
part(new THREE.TorusGeometry(.31, .05, 6, 20), M.yel, pilot, [0, -.02, .38], [1.15, 0, 0], false);      // reflective band
for (const sx of [-1, 1]) part(new THREE.BoxGeometry(.07, .62, .05), M.yel, torso, [sx * .1, 0, -.29], [0, 0, sx * .5], false);  // reflective X on the back
for (const sx of [-1, 1]) {
  const arm = part(new THREE.CapsuleGeometry(.1, .5, 4, 10), M.black, pilot, [sx * .36, .45, .5], [-.35, 0, sx * .45]);
  part(new THREE.SphereGeometry(.12, 10, 8), M.black, arm, [0, .38, 0]);                                // gloves on the handles
}
const head = new THREE.Group(); head.position.set(0, .48, .82); pilot.add(head);
part(new THREE.SphereGeometry(.24, 18, 14), M.skin, head, [0, 0, 0]);
const helmet = part(new THREE.SphereGeometry(.29, 22, 14, 0, Math.PI * 2, 0, Math.PI / 2), M.yel, head, [0, -.02, .02], [Math.PI / 2 - .25, 0, 0]);
part(new THREE.CylinderGeometry(.36, .36, .04, 24), M.yel, head, [0, -.02, -.04], [Math.PI / 2 - .25, 0, 0]);   // hard-hat brim
part(new THREE.BoxGeometry(.06, .5, .08), M.yel, helmet, [0, .05, .23], [0, 0, 0], false);                      // ridge
const ponytail = part(new THREE.CapsuleGeometry(.08, .32, 4, 8), M.hair, head, [0, -.3, -.05], [-.3, 0, 0]);
const visor = part(new THREE.BoxGeometry(.4, .1, .12), M.glass, head, [0, .2, .05], [0, 0, 0], false);

/* ---------- shield bubble ---------- */
const bubbleMat = new THREE.MeshBasicMaterial({ color: 0x4cc3ff, transparent: true, opacity: .18, blending: THREE.AdditiveBlending, depthWrite: false });
const bubble = new THREE.Mesh(new THREE.SphereGeometry(2.2, 28, 18), bubbleMat); bubble.scale.set(1, 1.25, .8); root.add(bubble);
const MODEC = { eye: 0x4cc3ff, glove: 0x3cff6a, helm: 0xffd21f, aid: 0xff5577 };

/* ---------- per-frame animation ---------- */
let roll = 0, pitch = 0, recoil = 0, spin = 0, t = 0, flashT = 0, lastW = '', barrel = 1;
function update(s) {
  const dt = Math.min(.05, s.dt || 1 / 60); t += dt;
  roll += ((-(s.tilt || 0)) * 2.4 - roll) * Math.min(1, dt * 10);                // bank into turns
  pitch += ((s.boost ? .35 : 0) - pitch) * Math.min(1, dt * 6);
  const w = s.weapon || 'drill'; if (lastW && w !== lastW) barrel = 0; lastW = w;          // barrel roll when the tool changes
  barrel = Math.min(1, barrel + dt * 1.9); const br = barrel < 1 ? (1 - Math.pow(1 - barrel, 3)) * Math.PI * 2 : 0;
  const intro = s.intro || 0;                                                                // fly-in: nose up, full thrust
  root.rotation.set(-pitch - intro * .5, roll * .55 + br, -(s.tilt || 0) * .35);
  root.position.z = Math.sin(t * 5.5) * .07; root.position.x = Math.sin(t * 2.3) * .03;
  pilot.rotation.y = roll * .25; head.rotation.z = (s.tilt || 0) * .3;
  const fem = s.sex === 'f'; ponytail.visible = fem; ponytail.rotation.x = -.3 + Math.sin(t * 9) * .12 - pitch * .6; ponytail.rotation.z = -roll * .4;
  for (const k in W) W[k].visible = k === (s.weapon || 'drill');
  if (s.fire) { recoil = Math.min(1, recoil + dt * 30); spin += dt * 38; } else { recoil = Math.max(0, recoil - dt * 8); spin += dt * 4; }
  nose.position.y = 1.72 - Math.sin(recoil * Math.PI) * .08 * (s.fire ? (Math.sin(t * 70) * .5 + .5) : 0);
  W.drill.bit.rotation.y = spin; W.disc.blade.rotation.y = spin * 1.6; chuck.rotation.y = spin;
  W.heat.core.material.emissiveIntensity = s.fire ? 2.4 + Math.sin(t * 40) * .6 : 1;
  const big = s.boost ? 2.1 : 1 + intro * 1.2;
  flames.forEach((f, i) => { const fl = .8 + Math.random() * .35 + Math.sin(t * 30 + i) * .1; f.scale.set(1 + (big - 1) * .35, fl * big, 1 + (big - 1) * .35); f.sp.material.color.setHex(s.boost ? 0x9fe4ff : 0xffa040); });
  const n = Math.max(0, Math.min(5, s.charge | 0)); leds.forEach((l, i) => { l.material = i < n ? M.led : M.ledOff; });
  M.strip.color.setHSL(.13, 1, .5 + .15 * Math.sin(t * 6));
  M.glow.color.setHex(s.boost ? 0x8fdcff : 0xffa030); M.glowCore.color.setHex(s.boost ? 0xffffff : 0xfff0b0);
  bubble.visible = !!s.mode; if (s.mode) { bubbleMat.color.setHex(MODEC[s.mode] || 0x4cc3ff); bubbleMat.opacity = .14 + .06 * Math.sin(t * 8); bubble.rotation.z += dt; }
  if (s.hit) flashT = .12; flashT = Math.max(0, flashT - dt);
  for (const m of flashables) { if (m.material.emissive && m.material !== M.heat && m.material !== M.glass) { m.material.emissive.setHex(flashT > 0 ? 0xffffff : 0x000000); m.material.emissiveIntensity = flashT > 0 ? .8 : 0; } }
}
window.RIG = renderer ? {
  ok: true, canvas: cv,
  draw(ctx, x, y, size, s, px) {
    px = Math.max(128, Math.min(512, Math.ceil((px || 256) / 64) * 64)); if (px !== cv.width) renderer.setSize(px, px, false);
    const t0 = performance.now(); update(s || {}); renderer.render(scene, cam); ctx.drawImage(cv, x - size / 2, y - size / 2, size, size);
    this.ms = this.ms * .95 + (performance.now() - t0) * .05; },
  ms: 4,
  blit(ctx, x, y, size) { ctx.drawImage(cv, x - size / 2, y - size / 2, size, size); }
} : { ok: false };
window.dispatchEvent(new Event('rigready'));
