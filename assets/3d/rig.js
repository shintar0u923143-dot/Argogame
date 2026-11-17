/* ARGOPOWER RIGS: the player's 3D ships, sidekick drones and signature-skill props, all built in code (no model files, fully owned).
   Rendered live with three.js; the 2D game draws the result every frame.
   window.RIG = {
     draw(ctx, x, y, size, state, px)   the player's rig. state: {rig:'weld'|'timber'|'spark', lv 1..7, tilt, fire, boost, charge, intro, cine, spin, shine, hit, dt}
     blit(ctx, x, y, size)              last rig frame again (boost after-images)
     pet(ctx, x, y, size, rig, t)       a sidekick drone (rendered once per frame, then petBlit for the 2nd one)
     skill(ctx, key, t, info, view)     full-screen 3D signature skill ('grind' | 'hammer' | 'volt')
     icon(key)                          small canvas picture of a skill prop for the skill button }  */
import * as THREE from './three.module.min.js';
import { RoomEnvironment } from './RoomEnvironment.js';

/* ---------- textures made in code ---------- */
function cvs(w, h, f) { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
const gradTex = () => { const t = cvs(4, 64, (x) => { const g = x.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, '#000'); g.addColorStop(.55, '#a0a0a0'); g.addColorStop(1, '#fff'); x.fillStyle = g; x.fillRect(0, 0, 4, 64); }); t.colorSpace = THREE.NoColorSpace; return t; };
const dotTex = () => cvs(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
const woodTex = () => cvs(128, 128, (x) => { x.fillStyle = '#b5773e'; x.fillRect(0, 0, 128, 128); for (let i = 0; i < 40; i++) { x.strokeStyle = `rgba(${90 + Math.random() * 40},${50 + Math.random() * 25},20,.55)`; x.lineWidth = 1 + Math.random() * 2; x.beginPath(); const y = Math.random() * 128; x.moveTo(0, y); x.bezierCurveTo(40, y + 6 * Math.sin(i), 80, y - 6, 128, y + 3); x.stroke(); } x.fillStyle = 'rgba(70,35,10,.5)'; for (let i = 0; i < 3; i++) { x.beginPath(); x.ellipse(20 + Math.random() * 90, 20 + Math.random() * 90, 6, 3, 0, 0, 7); x.fill(); } });
const hazardTex = () => cvs(128, 32, (x) => { x.fillStyle = '#f5b800'; x.fillRect(0, 0, 128, 32); x.fillStyle = '#17171b'; for (let i = -2; i < 10; i++) { x.beginPath(); x.moveTo(i * 16, 32); x.lineTo(i * 16 + 8, 32); x.lineTo(i * 16 + 24, 0); x.lineTo(i * 16 + 16, 0); x.fill(); } });
const discTex = () => cvs(128, 128, (x) => { x.fillStyle = '#5b5e66'; x.beginPath(); x.arc(64, 64, 64, 0, 7); x.fill(); for (let i = 0; i < 900; i++) { x.fillStyle = Math.random() < .5 ? '#3d3f45' : '#7d818a'; x.fillRect(Math.random() * 128, Math.random() * 128, 2, 2); }
  x.strokeStyle = '#2a2b30'; x.lineWidth = 3; for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(64, 64); x.lineTo(64 + Math.cos(i) * 64, 64 + Math.sin(i) * 64); x.stroke(); }
  x.fillStyle = '#f5b800'; x.beginPath(); x.arc(64, 64, 22, 0, 7); x.fill(); x.fillStyle = '#e1251b'; x.font = 'bold 13px Arial Narrow,sans-serif'; x.textAlign = 'center'; x.fillText('ARGO', 64, 69); });
let logoImg = null; const logoWaiters = [];
{ const im = new Image(); im.onload = () => { logoImg = im; logoWaiters.forEach(f => f()); }; im.src = new URL('../logo.webp', import.meta.url).href; }
function badgeTex() {   /* the real ARGOPOWER logo on a white badge */
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; const x = c.getContext('2d');
  const paint = () => { x.clearRect(0, 0, 512, 128); x.fillStyle = '#fff'; x.strokeStyle = '#e1251b'; x.lineWidth = 8; x.beginPath(); if (x.roundRect) x.roundRect(6, 6, 500, 116, 22); else x.rect(6, 6, 500, 116); x.fill(); x.stroke();
    if (logoImg) x.drawImage(logoImg, 30, 16, 452, 96); else { x.font = 'bold 72px Arial Narrow, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#e1251b'; x.fillText('ARGOPOWER', 256, 68); } t.needsUpdate = true; };
  paint(); if (!logoImg) logoWaiters.push(paint); return t; }

/* ---------- materials ---------- */
const RED = 0xe1251b, BLACK = 0x1b1b20, YEL = 0xf5b800, STEEL = 0xc9ced6;
const std = (color, r = .35, m = .2, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: r, metalness: m, ...o });
const add = (color, o = {}) => new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, ...o });
const M = {
  red: std(RED, .32, .15), black: std(BLACK, .45, .3), char: std(0x34363d, .5, .5), yel: std(YEL, .3, .2), steel: std(STEEL, .18, .95), brass: std(0xd4a54a, .25, .9),
  white: std(0xf2f2f2, .35, .05), glass: std(0x66d9ff, .05, .2, { emissive: 0x1a6aa0, emissiveIntensity: .6 }), mask: std(0x12302c, .15, .5, { emissive: 0x0a3a30, emissiveIntensity: .5 }),
  wood: std(0xffffff, .65, 0, { map: woodTex() }), hazard: std(0xffffff, .4, .1, { map: hazardTex() }), green: std(0x3a6b4c, .4, .5), cable: std(0x222226, .6, .1), orangeCable: std(0xff7a1a, .5, .1),
  disc: std(0xffffff, .45, .7, { map: discTex() }), tester: std(0xd7261d, .35, .05), clear: std(0xffffff, .05, 0, { transparent: true, opacity: .35 }),
  glow: add(0xff8a20, { map: gradTex(), side: THREE.DoubleSide }), glowCore: add(0xfff0b0, { map: gradTex(), side: THREE.DoubleSide }),
  led: new THREE.MeshBasicMaterial({ color: 0x3cff6a }), ledOff: new THREE.MeshBasicMaterial({ color: 0x23302a }),
  strip: new THREE.MeshBasicMaterial({ color: 0xffd21f }), arc: new THREE.MeshBasicMaterial({ color: 0xbfe9ff }),
  vent: std(0x331008, .4, .2, { emissive: 0xff5a10, emissiveIntensity: 1.2 }), neon: std(0x401010, .3, 0, { emissive: 0xff3020, emissiveIntensity: .4 }),
  coil: std(0xb87333, .25, .95), orb: std(0x9fe4ff, .1, 0, { emissive: 0x66ccff, emissiveIntensity: 1.5 })
};
const INK = new THREE.ShaderMaterial({ side: THREE.BackSide, uniforms: { w: { value: .045 } },
  vertexShader: 'uniform float w; void main(){ vec3 p = position + normal * w; gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0); }',
  fragmentShader: 'void main(){ gl_FragColor = vec4(0.06,0.05,0.07,1.0); }' });
const INKW = new THREE.ShaderMaterial({ side: THREE.BackSide, uniforms: { w: { value: .035 } }, vertexShader: INK.vertexShader, fragmentShader: INK.fragmentShader });
function part(geo, mat, parent, pos, rot, ink = true) {
  const m = new THREE.Mesh(geo, mat); if (pos) m.position.set(...pos); if (rot) m.rotation.set(...rot); parent.add(m);
  if (ink) m.add(new THREE.Mesh(geo, ink === 2 ? INKW : INK)); return m; }
function roundBox(w, h, d, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(.001, d - r * 2), bevelEnabled: true, bevelThickness: r, bevelSize: r * .9, bevelSegments: 3, curveSegments: 6 });
  g.translate(0, 0, -(d - r * 2) / 2); g.computeVertexNormals(); return g; }
const cyl = (rt, rb, h, s = 20) => new THREE.CylinderGeometry(rt, rb, h, s);
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const DOT = dotTex();
function sprite(color, sc) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: DOT, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); s.scale.set(sc, sc, 1); return s; }
function helix(r, len, turns, tube, mat, parent, pos, rot) {
  const pts = []; for (let i = 0; i <= turns * 24; i++) { const a = i / 24 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, i / (turns * 24) * len - len / 2, Math.sin(a) * r)); }
  return part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 24, tube, 6), mat, parent, pos, rot, false); }

/* ---------- renderer (one fixed 512px canvas; each picture uses a corner viewport, so nothing is ever resized) ---------- */
const CV = 512, cv = document.createElement('canvas'); cv.width = cv.height = CV;
let renderer = null;
try { renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, premultipliedAlpha: false, preserveDrawingBuffer: true }); } catch (e) { renderer = null; }
let envTex = null;
if (renderer) { renderer.setPixelRatio(1); renderer.setSize(CV, CV, false); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  envTex = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; renderer.setScissorTest(true); }
function lights(scene) { scene.environment = envTex; const k = new THREE.DirectionalLight(0xffffff, 2.2); k.position.set(-3, -2, 8); scene.add(k); const r = new THREE.DirectionalLight(0xffd9a0, 1.4); r.position.set(4, 6, 3); scene.add(r); }
function shot(scene, camera, px) { renderer.setViewport(0, 0, px, px); renderer.setScissor(0, 0, px, px); renderer.setClearColor(0, 0); renderer.clear(); renderer.render(scene, camera); }
const copyOf = (px) => { const c = document.createElement('canvas'); c.width = c.height = px; c.getContext('2d').drawImage(cv, 0, CV - px, px, px, 0, 0, px, px); return c; };

/* ======================================================================= */
/*  PLAYER RIGS                                                              */
/* ======================================================================= */
const scene = new THREE.Scene(); lights(scene);
const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
const CAM_G = new THREE.Vector3(0, -8.2, 7.6), CAM_S = new THREE.Vector3(0, -8.6, 2.6), LOOK_G = new THREE.Vector3(0, .1, 0), LOOK_S = new THREE.Vector3(0, .1, .25), _look = new THREE.Vector3();
cam.position.copy(CAM_G); cam.lookAt(LOOK_G);
const root = new THREE.Group(); scene.add(root);
const badgeMat = new THREE.MeshStandardMaterial({ map: badgeTex(), emissiveMap: null, emissive: 0xffffff, emissiveIntensity: 0, roughness: .35, transparent: true, polygonOffset: true, polygonOffsetFactor: -2 });
badgeMat.emissiveMap = badgeMat.map;

function flame(list, parent, pos, r, len) {
  const f = new THREE.Group(); f.position.set(...pos); parent.add(f);
  part(new THREE.ConeGeometry(r, len, 16, 1, true), M.glow, f, [0, -len / 2, 0], [Math.PI, 0, 0], false);
  part(new THREE.ConeGeometry(r * .5, len * .62, 12, 1, true), M.glowCore, f, [0, -len * .31, 0], [Math.PI, 0, 0], false);
  const sp = sprite(0xffa040, r * 5); sp.position.set(0, -.05, .05); f.add(sp); f.sp = sp; list.push(f); return f; }
function spoilerOn(parent, y, z) {   // racing spoiler carrying the logo badge (seen from above in play and from behind in the showcase)
  const s = new THREE.Group(); s.position.set(0, y, z); s.rotation.x = .62; parent.add(s);
  part(roundBox(2.3, .62, .1, .04), M.black, s); part(box(2.34, .07, .12), M.yel, s, [0, .31, 0], null, false);
  part(new THREE.PlaneGeometry(2.1, .5), badgeMat, s, [0, -.02, .056], null, false);
  for (const sx of [-1, 1]) { part(box(.1, .14, .62), M.black, parent, [sx * .42, y + .02, z - .33], [-.25, 0, 0]); part(box(.05, .62, .3), M.red, s, [sx * 1.17, 0, -.12]); }
  return s; }
function pilotOn(parent, helmetMat, welder) {
  const p = new THREE.Group(); p.position.set(0, -.62, .3); p.scale.setScalar(.92); parent.add(p);
  const torso = part(new THREE.CapsuleGeometry(.3, .35, 6, 14), M.black, p, [0, .05, .42], [1.15, 0, 0]);
  part(new THREE.TorusGeometry(.31, .05, 6, 20), M.yel, p, [0, -.02, .38], [1.15, 0, 0], false);
  for (const sx of [-1, 1]) part(box(.07, .62, .05), M.yel, torso, [sx * .1, 0, -.29], [0, 0, sx * .5], false);
  for (const sx of [-1, 1]) { const arm = part(new THREE.CapsuleGeometry(.1, .5, 4, 10), M.black, p, [sx * .36, .45, .5], [-.35, 0, sx * .45]); part(new THREE.SphereGeometry(.12, 10, 8), M.black, arm, [0, .38, 0]); }
  const head = new THREE.Group(); head.position.set(0, .48, .82); p.add(head);
  if (welder) {   // welding mask: boxy shell + dark green visor
    part(roundBox(.5, .55, .5, .1), M.char, head, [0, .02, 0]); part(box(.36, .14, .1), M.mask, head, [0, .2, .2], null, false);
    part(box(.06, .5, .08), M.yel, head, [0, -.05, .27], null, false);
  } else {
    part(new THREE.SphereGeometry(.24, 18, 14), M.black, head);
    const hm = part(new THREE.SphereGeometry(.29, 22, 14, 0, Math.PI * 2, 0, Math.PI / 2), helmetMat, head, [0, -.02, .02], [Math.PI / 2 - .25, 0, 0]);
    part(cyl(.36, .36, .04, 24), helmetMat, head, [0, -.02, -.04], [Math.PI / 2 - .25, 0, 0]); part(box(.06, .5, .08), helmetMat, hm, [0, .05, .23], null, false);
    part(box(.4, .1, .12), M.glass, head, [0, .2, .05], null, false);
  }
  p.head = head; return p; }
function leds(parent, y, z) { const a = []; for (let i = 0; i < 5; i++) a.push(part(box(.13, .07, .04), M.ledOff, parent, [-.32 + i * .16, y, z], null, false)); return a; }
/* add-ons that bolt on as the rig levels up: each child has .lv = level it appears at */
function addon(list, lv, obj) { obj.lv = lv; list.push(obj); return obj; }

const RIGS = {};
/* ---------- ARGO WELDSTORM: armored welder rig, TIG torch nose, welding machine on the back ---------- */
{ const g = new THREE.Group(), R = { g, flames: [], add: [] }; root.add(g); RIGS.weld = R;
  part(roundBox(1.45, 2.2, .7, .18), M.char, g, [0, -.25, 0]);
  part(box(1.5, .22, .55), M.red, g, [0, .45, 0]); part(box(1.5, .22, .55), M.red, g, [0, -.95, 0]);
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) part(box(.04, .32, .16), M.vent, g, [sx * .74, -.5 + i * .3, .1], null, false);   // glowing heat vents
  // welding machine on the back: box with dials and a handle
  const wm = new THREE.Group(); wm.position.set(0, -1.15, .5); g.add(wm);
  part(roundBox(1.1, .55, .55, .06), M.red, wm); part(box(.7, .2, .04), M.black, wm, [0, -.29, .1], [Math.PI / 2, 0, 0], false);
  R.dials = []; for (const sx of [-.25, .25]) { const d = part(cyl(.1, .1, .05, 16), M.white, wm, [sx, -.29, .14], [Math.PI / 2, 0, 0], false); part(box(.02, .08, .02), M.red, d, [0, .03, .03], null, false); R.dials.push(d); }
  part(new THREE.TorusGeometry(.25, .04, 6, 16, Math.PI), M.black, wm, [0, 0, .3], [0, 0, 0]);
  // argon gas tanks
  for (const sx of [-1, 1]) { const tk = part(cyl(.22, .22, 1.1, 18), M.green, g, [sx * 1.0, -.55, .05]); part(cyl(.1, .14, .16), M.steel, tk, [0, .62, 0]); part(cyl(.23, .23, .08), M.yel, tk, [0, .2, 0], null, false); }
  // TIG torch nose: ceramic cup + tungsten tip that glows blue-white
  part(cyl(.42, .52, .9, 24), M.black, g, [0, 1.15, .05]);
  const nose = new THREE.Group(); nose.position.set(0, 1.6, .05); g.add(nose); R.nose = nose;
  part(cyl(.2, .3, .55, 20), M.steel, nose, [0, .25, 0]); part(cyl(.13, .2, .35, 18), std(0xd9c7a8, .6, 0), nose, [0, .66, 0]);
  R.tip = part(new THREE.ConeGeometry(.045, .35, 8), M.arc, nose, [0, .95, 0], null, false);
  R.tipGlow = sprite(0xbfe9ff, 1.2); R.tipGlow.position.set(0, 1.1, .05); nose.add(R.tipGlow);
  helix(.12, .9, 5, .035, M.orangeCable, g, [.45, .9, .3], [0, 0, .3]);   // torch cable
  // wings
  const ws = new THREE.Shape(); ws.moveTo(0, .5); ws.lineTo(1.45, -.25); ws.lineTo(1.5, -.85); ws.lineTo(0, -.65);
  const wg = new THREE.ExtrudeGeometry(ws, { depth: .16, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 2 }); wg.translate(0, 0, -.08);
  for (const sx of [-1, 1]) { const w = part(wg, M.char, g, [sx * .72, -.2, -.1]); w.scale.x = sx; part(box(.2, .6, .22), M.red, g, [sx * 2.2, -.7, -.1], [0, 0, sx * .3]);
    flame(R.flames, g, [sx * 1.0, -1.15, .05], .2, .9); }
  flame(R.flames, g, [0, -1.45, -.05], .32, 1.4);
  spoilerOn(g, -1.62, 1.05); R.pilot = pilotOn(g, M.yel, true); R.leds = leds(g, -.82, .4);
  // level add-ons: side torch cannons (2), armor plates (4), second cannons (6), max: blue arc coils (7)
  for (const sx of [-1, 1]) { const c = addon(R.add, -1, new THREE.Group()); c.position.set(sx * 1.55, .05, -.05); g.add(c); part(cyl(.11, .15, .7, 14), M.steel, c); part(new THREE.ConeGeometry(.04, .2, 8), M.arc, c, [0, .45, 0], null, false);
    const a = addon(R.add, 4, part(roundBox(.5, .9, .14, .05), M.red, g, [sx * .78, .2, .4], [0, sx * .35, 0])); a.ink = 1;
    const c2 = addon(R.add, -2, new THREE.Group()); c2.position.set(sx * 2.05, -.25, -.05); g.add(c2); part(cyl(.09, .12, .55, 12), M.steel, c2); part(new THREE.ConeGeometry(.035, .16, 8), M.arc, c2, [0, .36, 0], null, false);
    const m = addon(R.add, 7, new THREE.Group()); m.position.set(sx * .78, -.05, .45); g.add(m); helix(.12, .55, 4, .03, M.arc, m, [0, 0, 0]); }
  R.glowC = 0xbfe9ff; }

/* ---------- ARGO TIMBERJACK: carpenter rig, giant cordless drill nose, wood panels, circular saw ---------- */
{ const g = new THREE.Group(), R = { g, flames: [], add: [] }; root.add(g); RIGS.timber = R;
  part(roundBox(1.25, 2.1, .62, .16), M.red, g, [0, -.25, 0]);
  part(roundBox(1.32, .55, .7, .12), M.black, g, [0, -1.05, 0]); part(box(1.33, .09, .5), M.yel, g, [0, -.72, 0], null, false);
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) part(cyl(.035, .035, .03, 8), M.brass, g, [sx * .5, .55 - i * .45, .32], [Math.PI / 2, 0, 0], false);   // brass rivets
  // giant cordless drill on the nose: motor body, grip, chuck and a spinning bit
  const nose = new THREE.Group(); nose.position.set(0, 1.05, .1); g.add(nose); R.nose = nose;
  part(roundBox(.75, 1.2, .7, .2), M.red, nose, [0, .1, 0]); part(cyl(.3, .3, .2, 20), M.black, nose, [0, .78, 0]);
  R.chuck = part(cyl(.2, .27, .38, 18), M.steel, nose, [0, 1.05, 0]);
  const bit = new THREE.Group(); bit.position.set(0, 1.25, 0); nose.add(bit); R.bit = bit;
  part(new THREE.ConeGeometry(.15, 1.05, 6, 6), M.steel, bit, [0, .52, 0]);
  helix(.1, .8, 4, .03, M.black, bit, [0, .45, 0]);
  part(box(.8, .14, .5), M.black, nose, [0, -.35, 0]);
  // wings with wood panels and a tool belt
  const ws = new THREE.Shape(); ws.moveTo(0, .55); ws.lineTo(1.55, -.35); ws.lineTo(1.6, -.8); ws.lineTo(.9, -.6); ws.lineTo(0, -.6);
  const wg = new THREE.ExtrudeGeometry(ws, { depth: .14, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 2 }); wg.translate(0, 0, -.07);
  for (const sx of [-1, 1]) { const w = part(wg, M.wood, g, [sx * .55, -.15, -.05]); w.scale.x = sx;
    part(box(.18, .55, .2), M.yel, g, [sx * 2.12, -.65, -.05], [0, 0, sx * .35]);
    const pod = part(cyl(.26, .3, 1.1, 18), M.red, g, [sx * 1.15, -.6, -.02]); part(cyl(.3, .22, .22, 18), M.black, pod, [0, -.62, 0]);
    flame(R.flames, g, [sx * 1.15, -1.25, -.02], .22, 1.0); part(box(.06, .7, .04), M.strip, pod, [sx * .2, .05, .22], null, false); }
  flame(R.flames, g, [0, -1.36, -.05], .3, 1.35);
  part(box(1.4, .14, .1), std(0x6b3d1d, .7, 0), g, [0, .1, .34], null, false);   // tool belt
  for (let i = 0; i < 5; i++) part(box(.06, .22, .05), M.steel, g, [-.4 + i * .2, .1, .42], null, false);   // nail strips
  // circular saw blade mounted behind the pilot
  R.saw = part(cyl(.55, .55, .04, 32), M.disc, g, [0, -1.0, .78], [Math.PI / 2 - .35, 0, 0], 2);
  spoilerOn(g, -1.32, .95); R.pilot = pilotOn(g, M.yel, false); R.leds = leds(g, -.78, .37);
  for (const sx of [-1, 1]) { const c = addon(R.add, -1, new THREE.Group()); c.position.set(sx * 1.6, .1, 0); g.add(c); part(roundBox(.28, .55, .28, .06), M.red, c); const b = part(new THREE.ConeGeometry(.07, .4, 6), M.steel, c, [0, .45, 0], null, false); c.bit = b;
    addon(R.add, 4, part(box(.5, .35, .08), M.wood, g, [sx * .62, .62, .3], [0, sx * .3, 0]));
    const c2 = addon(R.add, -2, new THREE.Group()); c2.position.set(sx * 2.05, -.2, 0); g.add(c2); part(roundBox(.22, .45, .22, .05), M.black, c2); c2.bit = part(new THREE.ConeGeometry(.06, .34, 6), M.steel, c2, [0, .38, 0], null, false);
    addon(R.add, 7, part(new THREE.TorusGeometry(.3, .04, 6, 20), M.strip, g, [sx * 1.15, -.6, .3], [0, 0, 0], false)); }
  R.glowC = 0xffa040; }

/* ---------- ARGO SPARKBOLT: electrician rig, staple gun nose, Tesla coils, hazard stripes, blue power ---------- */
{ const g = new THREE.Group(), R = { g, flames: [], add: [] }; root.add(g); RIGS.spark = R;
  part(roundBox(1.05, 2.25, .55, .16), M.black, g, [0, -.2, 0]);
  part(box(1.08, .3, .5), M.hazard, g, [0, .55, .02], null, false); part(box(1.08, .3, .5), M.hazard, g, [0, -.95, .02], null, false);
  helix(.08, 1.6, 7, .03, M.cable, g, [-.58, -.2, .2]); helix(.08, 1.6, 7, .03, M.orangeCable, g, [.58, -.2, .2]);
  // staple gun nose
  const nose = new THREE.Group(); nose.position.set(0, 1.05, .1); g.add(nose); R.nose = nose;
  part(roundBox(.7, 1.15, .62, .12), std(0x8d939c, .3, .7), nose, [0, .2, 0]); part(box(.72, .3, .64), M.red, nose, [0, -.25, 0]);
  part(box(.5, .12, .5), M.black, nose, [0, .82, 0]); R.mag = part(box(.08, .9, .08), M.steel, nose, [0, .3, .35], null, false);
  R.tip = sprite(0x9fe4ff, .9); R.tip.position.set(0, .95, .1); nose.add(R.tip);
  // voltage tester clipped on the side
  const vt = new THREE.Group(); vt.position.set(.66, .2, .25); vt.rotation.z = .1; g.add(vt); part(cyl(.07, .07, .7, 12), M.tester, vt); part(cyl(.05, .05, .25, 10), M.clear, vt, [0, .25, 0], null, false);
  R.vneon = part(new THREE.CapsuleGeometry(.025, .12, 4, 6), M.neon, vt, [0, .25, 0], null, false); part(cyl(.025, .025, .5, 8), M.tester, vt, [0, -.55, 0], null, false);
  // swept wings with Tesla coils
  const ws = new THREE.Shape(); ws.moveTo(0, .4); ws.lineTo(1.7, -.55); ws.lineTo(1.7, -.85); ws.lineTo(0, -.55);
  const wg = new THREE.ExtrudeGeometry(ws, { depth: .1, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 2 }); wg.translate(0, 0, -.05);
  R.orbs = [];
  for (const sx of [-1, 1]) { const w = part(wg, M.hazard, g, [sx * .5, -.15, -.05]); w.scale.x = sx;
    const tc = new THREE.Group(); tc.position.set(sx * 1.85, -.75, .1); g.add(tc);
    part(cyl(.1, .16, .55, 14), M.black, tc, [0, 0, .25], [Math.PI / 2, 0, 0]); helix(.13, .4, 6, .025, M.coil, tc, [0, 0, .3], [Math.PI / 2, 0, 0]);
    part(new THREE.TorusGeometry(.2, .06, 8, 20), M.steel, tc, [0, 0, .58], null, false);
    const orb = part(new THREE.SphereGeometry(.11, 14, 10), M.orb, tc, [0, 0, .62], null, false); const s = sprite(0x66ccff, .9); orb.add(s); R.orbs.push(orb);
    flame(R.flames, g, [sx * .45, -1.4, -.02], .18, .9); }
  flame(R.flames, g, [0, -1.42, -.05], .26, 1.25);
  spoilerOn(g, -1.35, .9); R.pilot = pilotOn(g, M.white, false); R.leds = leds(g, -.75, .32);
  for (const sx of [-1, 1]) { const c = addon(R.add, -1, new THREE.Group()); c.position.set(sx * 1.2, .15, 0); g.add(c); part(roundBox(.3, .5, .25, .05), std(0x8d939c, .3, .7), c); part(box(.2, .08, .2), M.red, c, [0, .28, 0], null, false);
    addon(R.add, 4, helix(.06, .9, 5, .025, M.coil, g, [sx * .35, .7, .35]));
    const c2 = addon(R.add, -2, new THREE.Group()); c2.position.set(sx * 1.6, -.35, 0); g.add(c2); part(roundBox(.24, .4, .22, .05), std(0x8d939c, .3, .7), c2);
    addon(R.add, 7, part(new THREE.TorusGeometry(.42, .03, 6, 24), M.arc, g, [sx * 1.85, -.75, .62], null, false)); }
  R.glowC = 0x66ccff; }

/* shield bubble (unused in play: the game draws its own) */
let roll = 0, pitch = 0, recoil = 0, spin = 0, t = 0, flashT = 0, lastR = '', barrel = 1;
function update(s) {
  const dt = Math.min(.05, s.dt || 1 / 60); t += dt;
  const rk = RIGS[s.rig] ? s.rig : 'timber', R = RIGS[rk];
  for (const k in RIGS) RIGS[k].g.visible = k === rk;
  if (s.still) { roll = -(s.tilt || 0) * 2.4; barrel = 1; } else { if (lastR && rk !== lastR) barrel = 0; lastR = rk;
  roll += ((-(s.tilt || 0)) * 2.4 - roll) * Math.min(1, dt * 10); }
  pitch += ((s.boost ? .35 : 0) - pitch) * Math.min(1, dt * 6);
  barrel = Math.min(1, barrel + dt * 1.9); const br = barrel < 1 ? (1 - Math.pow(1 - barrel, 3)) * Math.PI * 2 : 0;
  const intro = s.intro || 0, cine = s.cine || 0;
  cam.position.lerpVectors(CAM_G, CAM_S, cine); _look.lerpVectors(LOOK_G, LOOK_S, cine); cam.lookAt(_look);
  badgeMat.emissiveIntensity = (s.shine || 0) * .9;
  root.rotation.set(-pitch - intro * .5, roll * .55 + br, -(s.tilt || 0) * .35 + (s.spin || 0));
  root.position.z = Math.sin(t * 5.5) * .07; root.position.x = Math.sin(t * 2.3) * .03;
  R.pilot.rotation.y = roll * .25; R.pilot.head.rotation.z = (s.tilt || 0) * .3;
  const lv = s.lv || 1, at = s.at || 0; for (const a of R.add) a.visible = a.lv < 0 ? at >= -a.lv : lv >= a.lv;
  if (s.fire) { recoil = Math.min(1, recoil + dt * 30); spin += dt * 38; } else { recoil = Math.max(0, recoil - dt * 8); spin += dt * 4; }
  const kick = s.fire ? Math.sin(t * 70) * .5 + .5 : 0;
  if (rk === 'weld') { R.nose.position.y = 1.6; R.tip.scale.setScalar(s.fire ? 1 + Math.random() * .5 : .8); R.tipGlow.material.opacity = s.fire ? .7 + Math.random() * .3 : .35; R.tipGlow.scale.setScalar(s.fire ? 1.4 + Math.random() * .6 : .9);
    R.dials[0].rotation.y = Math.sin(t * 2) * .8; M.vent.emissiveIntensity = 1 + .4 * Math.sin(t * 7) + (s.fire ? .5 : 0); }
  else if (rk === 'timber') { R.nose.position.y = 1.05 - kick * .05; R.bit.rotation.y = spin; R.chuck.rotation.y = spin; R.saw.rotation.y = spin * .25;
    for (const a of R.add) if (a.bit) a.bit.rotation.y = spin; }
  else { R.nose.position.y = 1.05 - kick * .07; R.mag.position.y = .3 - kick * .05; R.tip.material.opacity = s.fire ? .5 + Math.random() * .5 : .25;
    R.orbs.forEach((o, i) => { o.material.emissiveIntensity = 1.2 + Math.random() * 1.3; o.scale.setScalar(.9 + Math.random() * .25); });
    M.neon.emissiveIntensity = .4 + (s.charge || 0) * .35 + Math.random() * .2; }
  const big = s.boost ? 2.1 : 1 + intro * 1.2;
  R.flames.forEach((f, i) => { const fl = .8 + Math.random() * .35 + Math.sin(t * 30 + i) * .1; f.scale.set(1 + (big - 1) * .35, fl * big, 1 + (big - 1) * .35); f.sp.material.color.setHex(s.boost ? 0x9fe4ff : R.glowC); });
  const n = Math.max(0, Math.min(5, s.charge | 0)); R.leds.forEach((l, i) => { l.material = i < n ? M.led : M.ledOff; });
  M.strip.color.setHSL(.13, 1, .5 + .15 * Math.sin(t * 6)); M.arc.color.setHSL(.55, .6, .82 + .12 * Math.random());
  const blue = rk === 'spark' || s.boost;
  M.glow.color.setHex(blue ? 0x5fb8ff : rk === 'weld' ? 0xff7a20 : 0xffa030); M.glowCore.color.setHex(blue ? 0xe6f6ff : 0xfff0b0);
  if (s.hit) flashT = .12; flashT = Math.max(0, flashT - dt);
}

/* ======================================================================= */
/*  SIDEKICK DRONES                                                          */
/* ======================================================================= */
const pScene = new THREE.Scene(); lights(pScene);
const pCam = new THREE.PerspectiveCamera(30, 1, .1, 50); pCam.position.set(0, -3.4, 3.1); pCam.lookAt(0, 0, 0);
const PETS = {};
{ // Arc Drone (Weldstorm): round drone with a mini TIG torch
  const g = new THREE.Group(); pScene.add(g); PETS.weld = g;
  part(new THREE.SphereGeometry(.55, 20, 14), M.char, g); part(new THREE.TorusGeometry(.62, .08, 8, 24), M.red, g, [0, 0, 0], [Math.PI / 2, 0, 0]);
  part(box(.4, .14, .1), M.mask, g, [0, .3, .38], [-.5, 0, 0], false); part(cyl(.1, .16, .5), M.steel, g, [0, .7, 0]); g.tip = part(new THREE.ConeGeometry(.03, .2, 6), M.arc, g, [0, 1.02, 0], null, false);
  g.glow = sprite(0xbfe9ff, 1); g.glow.position.set(0, 1.1, 0); g.add(g.glow); g.rot = part(cyl(.5, .5, .02, 3), add(0xffffff, { opacity: .25 }), g, [0, 0, .6], [Math.PI / 2, 0, 0], false); }
{ // Woodpecker (Timberjack): mini drill drone with little wings
  const g = new THREE.Group(); pScene.add(g); PETS.timber = g;
  part(roundBox(.6, .9, .55, .16), M.red, g); part(cyl(.18, .22, .25), M.steel, g, [0, .55, 0]); g.bit = part(new THREE.ConeGeometry(.11, .6, 6), M.steel, g, [0, .95, 0]);
  for (const sx of [-1, 1]) { const w = part(box(.7, .3, .06), M.wood, g, [sx * .55, -.05, .1], [0, 0, sx * -.3]); w.sx = sx; (g.wings = g.wings || []).push(w); }
  part(new THREE.SphereGeometry(.12, 10, 8), M.glass, g, [0, .15, .3], null, false); }
{ // Tesla Buddy (Sparkbolt): floating mini Tesla coil
  const g = new THREE.Group(); pScene.add(g); PETS.spark = g;
  part(cyl(.3, .4, .35), M.black, g, [0, 0, -.2], [Math.PI / 2, 0, 0]); helix(.2, .7, 8, .035, M.coil, g, [0, 0, .25], [Math.PI / 2, 0, 0]);
  part(new THREE.TorusGeometry(.32, .09, 8, 20), M.steel, g, [0, 0, .65], null, false); g.orb = part(new THREE.SphereGeometry(.18, 14, 10), M.orb, g, [0, 0, .72], null, false);
  g.glow = sprite(0x66ccff, 1.6); g.glow.position.set(0, 0, .75); g.add(g.glow); part(box(.9, .12, .12), M.hazard, g, [0, 0, -.3], null, false); }
let petC = null;
const ATT = {};
{ const g = new THREE.Group(); pScene.add(g); ATT.weld = g; g.visible = false; part(cyl(.22, .3, 1.3, 16), M.steel, g); part(cyl(.3, .3, .2, 16), M.red, g, [0, -.55, 0]); part(cyl(.14, .2, .35, 14), std(0xd9c7a8, .6, 0), g, [0, .8, 0]); part(new THREE.ConeGeometry(.06, .4, 8), M.arc, g, [0, 1.15, 0], null, false); const sp = sprite(0xbfe9ff, 1.4); sp.position.set(0, 1.3, .1); g.add(sp); helix(.1, .9, 5, .04, M.orangeCable, g, [.35, -.2, 0]); }
{ const g = new THREE.Group(); pScene.add(g); ATT.timber = g; g.visible = false; part(roundBox(.55, 1.0, .55, .12), M.red, g); part(cyl(.2, .26, .35, 16), M.steel, g, [0, .65, 0]); part(new THREE.ConeGeometry(.14, .8, 6), M.steel, g, [0, 1.2, 0]); helix(.09, .6, 4, .03, M.black, g, [0, 1.15, 0]); part(box(.6, .14, .5), M.black, g, [0, -.45, 0]); }
{ const g = new THREE.Group(); pScene.add(g); ATT.spark = g; g.visible = false; part(roundBox(.6, 1.0, .5, .1), std(0x8d939c, .3, .7), g); part(box(.62, .28, .52), M.red, g, [0, -.35, 0]); part(box(.08, .8, .08), M.steel, g, [0, .2, .3], null, false); const sp = sprite(0x9fe4ff, 1.2); sp.position.set(0, .7, .1); g.add(sp); }
const ICO = {};
function cachedIcon(key, f) { if (!ICO[key]) { f(); ICO[key] = copyOf(128); } return ICO[key]; }
function soloPet(rk, which) { for (const k in PETS) PETS[k].visible = which === 'pet' && k === rk; for (const k in ATT) ATT[k].visible = which === 'att' && k === rk; }

/* ======================================================================= */
/*  SIGNATURE SKILLS (full screen, 3D)                                       */
/* ======================================================================= */
let sR = null, sCv = null; const sScene = new THREE.Scene(); lights(sScene);
const sCam = new THREE.PerspectiveCamera(50, 360 / 640, 10, 3000);
function skillRenderer() {
  if (sR) return sR; sCv = document.createElement('canvas'); sCv.width = 360; sCv.height = 640;
  sR = new THREE.WebGLRenderer({ canvas: sCv, alpha: true, antialias: true, premultipliedAlpha: false });
  sR.setPixelRatio(1); sR.outputColorSpace = THREE.SRGBColorSpace; sR.toneMapping = THREE.ACESFilmicToneMapping; sR.toneMappingExposure = 1.2;
  sScene.environment = new THREE.PMREMGenerator(sR).fromScene(new RoomEnvironment(), .04).texture; return sR; }
const PROP = {};
function textTex(lines, w, h, fg, bg, font) { return cvs(w, h, (x) => { if (bg) { x.fillStyle = bg; x.beginPath(); if (x.roundRect) x.roundRect(4, 4, w - 8, h - 8, h * .22); else x.rect(4, 4, w - 8, h - 8); x.fill(); }
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; lines.forEach((l, i) => { x.font = l[1] || font; x.fillText(l[0], w / 2, h * (i + .5) / lines.length + 2); }); }); }
{ // GIANT GRINDER: modelled on the ARGO angle grinder: red motor body with the black ARGO badge, grey-khaki gear head, black rear housing, side handle and guard
  const g = new THREE.Group(); sScene.add(g); PROP.grind = g; g.visible = false;
  const body = new THREE.Group(); g.add(body); const KHAKI = std(0xa7a898, .45, .35);
  const motor = part(cyl(.46, .44, 1.9, 28), M.red, body, [-1.45, 0, 0], [0, 0, Math.PI / 2]); motor.scale.set(1, 1, .92);
  part(new THREE.PlaneGeometry(1.1, .34), new THREE.MeshStandardMaterial({ map: textTex([['A R G O']], 256, 80, '#fff', '#121214', 'bold 52px Arial, sans-serif'), transparent: true, roughness: .4, polygonOffset: true, polygonOffsetFactor: -2 }), body, [-1.35, 0, .435], null, false);
  const rear = part(cyl(.44, .36, 1.3, 24), M.black, body, [-3.0, 0, 0], [0, 0, Math.PI / 2]); rear.scale.set(1, 1, .9);
  for (let i = 0; i < 5; i++) part(box(.05, .5, .06), std(0x2c2c32, .6, .2), body, [-2.6 - i * .16, .2, .37], null, false);   // rear vents
  part(cyl(.14, .22, .6, 14), M.black, body, [-3.9, 0, 0], [0, 0, Math.PI / 2]);   // cable boot
  part(cyl(.08, .08, 1.2, 10), M.black, body, [-4.7, -.15, 0], [0, 0, Math.PI / 2 + .25], false);
  part(roundBox(1.0, 1.0, .95, .18), KHAKI, body, [0, 0, 0]);   // gear head
  for (let i = 0; i < 3; i++) part(box(.5, .07, .1), std(0x2a2a2e, .6, .2), body, [-.05, .25 - i * .16, .49], null, false);   // head vents
  part(cyl(.12, .12, .14, 12), M.black, body, [.15, .55, .1], null, false);   // spindle lock
  part(cyl(.13, .16, 1.25, 14), M.black, body, [.1, -.1, 1.05], [Math.PI / 2, 0, 0]);   // side handle (sticks out toward you)
  part(cyl(.16, .16, .35, 14), M.steel, body, [0, -.6, 0], null, false);   // spindle
  g.guard = part(new THREE.CylinderGeometry(1.48, 1.48, .34, 36, 1, true, Math.PI * .55, Math.PI), M.black, body, [0, -.66, 0]);
  part(new THREE.CircleGeometry(1.48, 36, Math.PI * .55 - Math.PI / 2, Math.PI), M.black, body, [0, -.5, 0], [-Math.PI / 2, 0, 0], false);
  g.disc = part(cyl(1.35, 1.35, .09, 40), M.disc, body, [0, -.82, 0], null, 2); }
{ // ARGO HAMMER: modelled on the ARGOPOWER 16 oz claw hammer: forged steel head (round face + split curved claw), yellow fiberglass handle, red-orange grip; pivot at the end of the handle
  const g = new THREE.Group(); sScene.add(g); PROP.hammer = g; g.visible = false;
  const YH = std(0xf2e21c, .35, .05), GRIP = std(0xf04a14, .55, .02), FORGE = std(0xb9bec6, .22, .95), DARK = std(0x8d939b, .3, .9);
  const hd = part(cyl(.2, .22, 4.0, 20), YH, g, [0, 2.15, 0]); hd.scale.set(1.25, 1, .85);
  const gr = part(cyl(.25, .27, 1.7, 20), GRIP, g, [0, .95, 0]); gr.scale.set(1.25, 1, .9);
  for (let i = 0; i < 6; i++) part(box(.5, .04, .1), std(0xc23a0e, .7, 0), g, [0, .35 + i * .22, .23], null, false);   // grip ribs
  part(new THREE.TorusGeometry(.26, .05, 6, 20), YH, g, [0, 1.82, 0], [Math.PI / 2, 0, 0], false);   // yellow accent
  part(cyl(.3, .26, .14, 20), GRIP, g, [0, .07, 0]);   // flared end
  part(new THREE.PlaneGeometry(1.7, .3), new THREE.MeshStandardMaterial({ map: textTex([['ARGOPOWER']], 512, 90, '#17171b', null, 'bold 64px Arial Narrow, sans-serif'), transparent: true, roughness: .4, polygonOffset: true, polygonOffsetFactor: -2 }), g, [0, 2.75, .175], [0, 0, Math.PI / 2], false);
  const head = new THREE.Group(); head.position.set(0, 4.25, 0); g.add(head); g.head = head;
  part(cyl(.27, .3, .5, 18), FORGE, head, [0, -.2, 0]);   // neck
  part(roundBox(.75, .62, .52, .1), FORGE, head, [0, 0, 0]);   // eye
  part(cyl(.32, .3, .75, 24), FORGE, head, [-.72, 0, 0], [0, 0, Math.PI / 2]);   // poll
  part(cyl(.37, .37, .16, 24), DARK, head, [-1.15, 0, 0], [0, 0, Math.PI / 2]);   // striking face
  const cs = new THREE.Shape(); cs.moveTo(.3, .28); cs.quadraticCurveTo(1.15, .32, 1.65, -.35); cs.lineTo(1.5, -.42); cs.quadraticCurveTo(1.05, .02, .3, -.12); cs.closePath();
  const cg = new THREE.ExtrudeGeometry(cs, { depth: .16, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 2 }); cg.translate(0, 0, -.08);
  for (const sz of [-1, 1]) part(cg, FORGE, head, [0, 0, sz * .12]);   // split claw
  part(new THREE.PlaneGeometry(.62, .42), new THREE.MeshStandardMaterial({ map: textTex([['ARGOPOWER', 'bold 30px Arial Narrow,sans-serif'], ['16 oz', 'bold 26px Arial,sans-serif'], ['DROP FORGED', 'bold 22px Arial,sans-serif']], 256, 170, '#3a3d44', null, ''), transparent: true, roughness: .4, polygonOffset: true, polygonOffsetFactor: -2 }), head, [0, .02, .27], null, false);
  g.edges = []; g.aura = sprite(0xffe680, 6); head.add(g.aura); }
{ // VOLTAGE TESTER: giant ArgoPower voltage tester pen (red handle, neon window, brass cap, slotted tip)
  const g = new THREE.Group(); sScene.add(g); PROP.volt = g; g.visible = false;
  part(cyl(.42, .42, 2.0, 24), M.tester, g, [0, 1.6, 0]);
  for (let i = 0; i < 6; i++) part(new THREE.TorusGeometry(.43, .05, 6, 24), std(0xb81d16, .4, 0), g, [0, 1.0 + i * .2, 0], [Math.PI / 2, 0, 0], false);
  part(cyl(.4, .4, .9, 24), M.clear, g, [0, 3.05, 0], null, false); g.neonM = std(0x401010, .3, 0, { emissive: 0xff5a1a, emissiveIntensity: .3 }); g.neon = part(new THREE.CapsuleGeometry(.16, .6, 6, 12), g.neonM, g, [0, 3.05, 0], null, false);
  g.neonGlow = sprite(0xff6a20, 2.4); g.neonGlow.material.depthTest = false; g.neonGlow.renderOrder = 5; g.neonGlow.position.set(0, 3.05, 0); g.add(g.neonGlow);
  part(cyl(.44, .44, .45, 24), M.brass, g, [0, 3.72, 0]); for (let i = 0; i < 7; i++) part(new THREE.TorusGeometry(.45, .03, 6, 24), M.brass, g, [0, 3.55 + i * .05, 0], [Math.PI / 2, 0, 0], false);
  part(box(.16, 1.9, .14), M.tester, g, [0, 2.75, .52]); part(box(.16, .3, .5), M.tester, g, [0, 3.62, .32]);   // pocket clip
  part(cyl(.42, .2, .5, 24), M.tester, g, [0, .35, 0]); part(cyl(.17, .17, 2.1, 16), M.tester, g, [0, -.95, 0]);
  part(new THREE.TorusGeometry(.32, .07, 8, 20), M.tester, g, [0, -.05, 0], [Math.PI / 2, 0, 0]);   // finger guard
  part(box(.24, .7, .06), M.steel, g, [0, -2.3, 0]); g.tip = sprite(0x9fe4ff, 1.6); g.tip.position.set(0, -2.7, .1); g.add(g.tip);
  part(new THREE.PlaneGeometry(1.55, .38), badgeMat, g, [0, 1.6, .44], [0, 0, Math.PI / 2], false); }

const ez = (x) => x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3), ezIn = (x) => x <= 0 ? 0 : x >= 1 ? 1 : x * x * x, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
/* place a prop at virtual-screen coords (x, y) — the camera maps the z=0 plane exactly onto the 360x640 game screen */
function at(o, x, y, z = 0) { o.position.set(x, -y, z); }
function poseSkill(k, t, I) {
  for (const p in PROP) PROP[p].visible = p === k; const g = PROP[k], bx = I.bx, by = I.by, bw = I.bw || 70;
  if (k === 'grind') {   // flies in, grinds back and forth across the boss with sparks, flies out   (damage .8 - 3.8)
    const s = 50; g.scale.setScalar(s);
    const tx = bx + 20 + Math.sin((t - .8) * 2.4) * bw * .55, ty = by + 14 + Math.sin(t * 31) * 3;
    const a = ez(t / .8), o = ezIn((t - 3.8) / .5);
    at(g, lerp(470, tx, a) + o * 320, lerp(-180, ty, a) - o * 420, 0);
    g.rotation.set(.75 - (1 - a) * .6, -.35, -.25 + (1 - a) * 1.2 + Math.sin((t - .8) * 2.4) * .1);
    g.disc.rotation.y = -t * 60; I.cx = tx - 52; I.cy = ty + 58; }
  else if (k === 'hammer') {   // side view, like a real hammer blow: raised behind, swings over, the round striking face lands DOWN on the boss at 1.3   (end 2.6)
    const W0 = I.W || 360, right = bx < W0 / 2, room = right ? W0 - 12 - bx : bx - 12;
    const s = clamp(room / 4.4, 30, 52), dir = right ? 1 : -1;
    const piv = { x: bx + dir * 4.25 * s, y: by + 26 - 1.15 * s };
    // wind-up below the boss leaning back, then a big overhead swing that lands with the handle level and the face down
    const H0 = I.H || 640, gw = { x: clamp(bx + dir * 30, 80, W0 - 80), y: Math.min(H0 - 230, by + 340) };
    let th, gx = gw.x, gy = gw.y, sc = s * 1.15;
    if (t < .3) { th = -.2; sc = s * 1.15 * ez(t / .3); gy += (1 - ez(t / .3)) * 120; }
    else if (t < 1.05) { th = -.2 - (t - .3) * .25 + Math.sin(t * 45) * .02 * (t - .3); }
    else if (t < 1.3) { const k = ezIn((t - 1.05) / .25); th = lerp(-.39, Math.PI / 2, k); gx = lerp(gw.x, piv.x, k); gy = lerp(gw.y, piv.y, k); sc = lerp(s * 1.15, s, k); }
    else { const q = t - 1.3; th = Math.PI / 2 - Math.max(0, Math.sin(Math.min(q, .3) / .3 * Math.PI)) * .12; gx = piv.x; gy = piv.y; sc = s; if (q > .85) sc = s * (1 - ez((q - .85) / .45)); }
    g.scale.setScalar(Math.max(.001, sc)); at(g, gx, gy, 0);
    g.rotation.set(0, 0, 0); g.rotateZ(th * dir); if (!right) g.rotateY(Math.PI); g.rotateX(.18);
    const hot = t < 1.3 ? .6 + .4 * Math.sin(t * 30) : Math.max(0, 1 - (t - 1.3) * 1.5);
    g.aura.material.opacity = hot * .9; g.aura.scale.setScalar(4 + hot * 4);
    I.hx = bx; I.hy = by; }
  else {   // VOLTAGE OVERLOAD: slides in pointing at the boss, charges up (neon glows, shakes), overload blast at 2.7   (end 3.6)
    const s = 42; g.scale.setScalar(s);
    let ux = bx - 70, uy = by - 600; const ul = Math.hypot(ux, uy); ux /= ul; uy /= ul;
    const tip = { x: bx - ux * 52, y: by - uy * 52 }, gx = tip.x - ux * 2.7 * s, gy = tip.y - uy * 2.7 * s;
    const a = ez(t / .5), o = ezIn((t - 3.1) / .5), ch = clamp((t - .5) / 2.2, 0, 1), sh = ch * ch * 7;
    at(g, lerp(gx - 260, gx, a) - o * 260 + (Math.random() - .5) * sh, lerp(gy + 380, gy, a) + o * 380 + (Math.random() - .5) * sh, 0);
    g.rotation.set(0, 0, 0); g.rotateZ(Math.atan2(ux, uy)); g.rotateY(.5 + t * .6);
    const over = t > 2.7 && t < 3.0;
    const pul = .75 + .25 * Math.sin(t * (6 + ch * 30)); g.neonM.emissive.setHSL(lerp(.02, .09, ch), 1, .5 + ch * .25); g.neonM.emissiveIntensity = over ? 8 : (.4 + ch * 5) * pul + Math.random() * ch;
    g.neonGlow.material.color.setHSL(lerp(.02, .1, ch), 1, .55 + ch * .2); g.neonGlow.material.opacity = Math.min(1, .25 + ch * .9) * pul; g.neonGlow.scale.setScalar(1.6 + ch * 5 * pul + (over ? 7 : 0)); g.tip.scale.setScalar(1 + ch * 3 + (over ? 6 : 0));
    I.tipX = tip.x + (a < 1 ? (a - 1) * 260 : 0); I.tipY = tip.y; }
}
function iconOf(k) {   // still picture of a skill prop for the skill button
  const keep = {}; for (const p in PROP) keep[p] = PROP[p].visible;
  const c = new THREE.PerspectiveCamera(30, 1, .1, 100); c.position.set(0, -2, 14); c.lookAt(0, 0, 0);
  const g = PROP[k]; const sv = { p: g.position.clone(), r: g.rotation.clone(), s: g.scale.clone() };
  for (const p in PROP) PROP[p].visible = p === k; g.position.set(k === 'grind' ? 1.4 : 0, k === 'hammer' ? -2.2 : k === 'volt' ? -.6 : 0, 0); g.scale.setScalar(k === 'grind' ? .95 : k === 'hammer' ? .95 : .85);
  g.rotation.set(k === 'grind' ? .2 : 0, k === 'grind' ? .3 : .4, k === 'grind' ? -.3 : k === 'hammer' ? -.6 : .7);
  if (k === 'hammer') g.aura.material.opacity = 0;
  const env = sScene.environment; sScene.environment = envTex; shot(sScene, c, 128); const out = copyOf(128); sScene.environment = env;
  g.position.copy(sv.p); g.rotation.copy(sv.r); g.scale.copy(sv.s); for (const p in PROP) PROP[p].visible = keep[p]; return out; }
const ICONS = {};

let rigC = null;
window.RIG = renderer ? {
  ok: true, ms: 4,
  draw(ctx, x, y, size, s, px) {
    px = Math.max(128, Math.min(CV, Math.ceil((px || 256) / 32) * 32));
    const t0 = performance.now(); update(s || {}); shot(scene, cam, px);
    if (!rigC || rigC.width !== px) { rigC = document.createElement('canvas'); rigC.width = rigC.height = px; }
    const rc = rigC.getContext('2d'); rc.clearRect(0, 0, px, px); rc.drawImage(cv, 0, CV - px, px, px, 0, 0, px, px);
    ctx.drawImage(rigC, x - size / 2, y - size / 2, size, size); this.ms = this.ms * .95 + (performance.now() - t0) * .05; },
  blit(ctx, x, y, size) { if (rigC) ctx.drawImage(rigC, x - size / 2, y - size / 2, size, size); },
  pet(ctx, x, y, size, rk, tt) {
    const g = PETS[rk] || PETS.timber; for (const k in PETS) PETS[k].visible = PETS[k] === g; for (const k in ATT) ATT[k].visible = false;
    g.rotation.set(0, Math.sin(tt * 3) * .3, Math.sin(tt * 1.7) * .25); g.position.z = Math.sin(tt * 6) * .1;
    if (g.bit) g.bit.rotation.y = tt * 40; if (g.wings) g.wings.forEach(w => w.rotation.y = Math.sin(tt * 40) * .5 * w.sx);
    if (g.glow) { g.glow.material.opacity = .5 + Math.random() * .5; g.glow.scale.setScalar((g === PETS.spark ? 1.4 : .8) + Math.random() * .5); }
    if (g.orb) g.orb.material.emissiveIntensity = 1.5 + Math.random() * 1.5; if (g.rot) g.rot.rotation.y = tt * 30;
    shot(pScene, pCam, 128); if (!petC) { petC = document.createElement('canvas'); petC.width = petC.height = 128; }
    const pc = petC.getContext('2d'); pc.clearRect(0, 0, 128, 128); pc.drawImage(cv, 0, CV - 128, 128, 128, 0, 0, 128, 128); ctx.drawImage(petC, x - size / 2, y - size / 2, size, size); },
  petBlit(ctx, x, y, size) { if (petC) ctx.drawImage(petC, x - size / 2, y - size / 2, size, size); },
  skill(ctx, k, t, I, view) {
    const r = skillRenderer(), w = Math.min(720, Math.round(view.W * view.res)), h = Math.round(w * view.H / view.W);
    if (sCv.width !== w) { r.setSize(w, h, false); }
    sCam.aspect = view.W / view.H; const z = (view.H / 2) / Math.tan(25 * Math.PI / 180); sCam.position.set(view.W / 2, -view.H / 2, z); sCam.lookAt(view.W / 2, -view.H / 2, 0); sCam.updateProjectionMatrix();
    poseSkill(k, t, I); r.render(sScene, sCam); ctx.drawImage(sCv, 0, 0, view.W, view.H); },
  icon(k) { if (!ICONS[k]) ICONS[k] = iconOf(k); return ICONS[k]; },
  petIcon(rk) { return cachedIcon('pet' + rk, () => { soloPet(rk, 'pet'); const g = PETS[rk]; g.rotation.set(0, .3, .2); g.position.z = 0; shot(pScene, pCam, 128); }); },
  attIcon(rk) { return cachedIcon('att' + rk, () => { soloPet(rk, 'att'); const g = ATT[rk]; g.rotation.set(.3, .5, -.35); g.scale.setScalar(.95); shot(pScene, pCam, 128); g.visible = false; }); },
  rigIcon(rk) { return cachedIcon('rig' + rk, () => { update({ rig: rk, lv: 7, at: 2, still: 1, cine: .4, spin: -.5, dt: 0 }); shot(scene, cam, 128); }); }
} : { ok: false };
window.dispatchEvent(new Event('rigready'));
