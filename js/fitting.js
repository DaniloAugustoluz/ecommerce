// Provador 3D — manequins realistas (malha humana CC0) em um estúdio de loja, com peças vestidas por shader.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

// [barra, fim da manga (0 ombro · 0.5 cotovelo · 1 pulso, -1 sem manga), decote, alça, folga, caimento]
const TOPS = {
  tee: [0.9, 0.27, 0.05, 0, 0.006, 1], long: [0.9, 0.96, 0.035, 0, 0.004, 0.8], jacket: [0.88, 0.97, -0.05, 0, 0.012, 1],
  tank: [0.9, -1, 0.1, 0.66, 0.004, 0.6], bra: [1.215, -1, 0.12, 0.6, 0.005, 0.55], crop: [1.17, 0.22, 0.06, 0, 0.008, 1],
};
// [cós, barra, faixa lateral, punho, folga]
const BOTS = { short: [1.0, 0.64, 1, 0, 0.011], legging: [1.06, 0.13, 0, 0, 0.002], jogger: [1.0, 0.11, 1, 1, 0.013] };
// medidas do tronco por gênero: [quadril, cintura, peito] → meia-largura, z mínimo, z máximo; ombro; base do pescoço
const BODY = {
  m: { a: [0.176, 0.149, 0.183], z0: [-0.154, -0.114, -0.14], z1: [0.075, 0.085, 0.106], sh: 0.211, neck: 1.537, scale: 1 },
  f: { a: [0.19, 0.138, 0.16], z0: [-0.162, -0.09, -0.113], z1: [0.075, 0.1, 0.172], sh: 0.176, neck: 1.512, scale: 0.925 },
};
const MOTION = {
  idle: { A: 0, K: 0.03, B: 0, El: 0, lean: 0, bob: 0, w: 1 },
  walk: { A: 0.42, K: 0.95, B: 0.36, El: 0.3, lean: 0.03, bob: 0.016, w: 5.4 },
  run: { A: 0.8, K: 1.65, B: 0.78, El: 1.25, lean: 0.15, bob: 0.04, w: 9.8 },
};

const HEAD = /* glsl */ `
uniform vec4 uTop, uBot; uniform float uTopOn, uBotOn, uSh, uNeck;
varying vec3 vBind; varying vec2 vArm; varying vec3 vBN;
float topM(vec3 p, vec2 arm){
  if(uTopOn<.5) return 0.; float ax=abs(p.x), y=p.y;
  if(arm.y>.5) return step(arm.x,uTop.y);
  if(y<uTop.x||y>1.62) return 0.;
  float neck=uNeck-uTop.z*(p.z>-.02?1.:.4)*(1.-smoothstep(.02,.11,ax));
  if(y>neck) return 0.;
  if(uTop.y<0. && ax>uSh*mix(1.2,uTop.w,smoothstep(1.27,1.41,y))) return 0.;
  return 1.;
}
float botM(vec3 p, vec2 arm){ return uBotOn*step(uBot.y,p.y)*step(p.y,uBot.x)*(1.-step(.5,arm.y)); }
`;
const VERT = /* glsl */ `
attribute vec2 _arm;
uniform float uTopLoose, uBotLoose, uTopDrape; uniform vec3 uEnvA, uEnvB, uEnvC;
// "Caimento": projeta o tronco vestido num envelope liso, como tecido solto sobre o corpo.
vec3 drape(vec3 p, float amt, out vec3 n, out float k){
  k=0.; n=vec3(0.,0.,1.); float y=p.y;
  if(amt<.01||y<.86||y>1.47) return p;
  float t1=smoothstep(.96,1.12,y), t2=smoothstep(1.12,1.3,y);
  float a=mix(mix(uEnvA.x,uEnvA.y,t1),uEnvA.z,t2), b=mix(mix(uEnvB.x,uEnvB.y,t1),uEnvB.z,t2), c=mix(mix(uEnvC.x,uEnvC.y,t1),uEnvC.z,t2);
  float f=amt*smoothstep(.86,.91,y)*(1.-smoothstep(1.34,1.47,y));
  vec2 q=vec2(p.x/a,(p.z-c)/b); float r=length(q);
  if(r<1.){ float s=mix(1.,1./max(r,.08),f); p.x*=s; p.z=c+(p.z-c)*s; k=f; n=normalize(vec3(q.x/a,0.,q.y/b)+vec3(0.,0.,1e-5)); }
  return p;
}`;
const FRAG = /* glsl */ `
uniform vec3 uTopA,uTopB,uTopAcc,uBotA,uBotB,uBotAcc; uniform float uWipeT,uWipeB,uZip;
float gMask; vec3 gGlow;`;
const FRAG_BODY = /* glsl */ `
{ vec3 p=vBind; float ax=abs(p.x); gMask=0.; gGlow=vec3(0.); bool arm=vArm.y>.5;
  float tm=topM(p,vArm), bm=(1.-tm)*botM(p,vArm);
  if(tm>.5){
    float e=mix(uTop.x-.06,1.66,uWipeT); vec3 c=p.y<e?uTopB:uTopA;
    float trim=arm?0.:step(p.y,uTop.x+.014);
    if(arm&&vArm.x>uTop.y-.035) trim=1.;
    if(uZip>.5&&p.z>0.&&ax<.005&&!arm) trim=1.;
    if(uZip>.5&&p.y>uNeck-.03&&ax<.075) trim=1.;
    if(!arm&&p.z>0.&&p.x>.05&&uTop.x<1.2){ float by=(p.y-1.325)/.0075, bi=floor(by); if(bi>=0.&&bi<3.&&fract(by)<.55&&p.x<.105-bi*.012) trim=1.; }   // marca no peito
    c=mix(c,uTopAcc,trim);
    if(!arm) c*=1.-.22*(1.-smoothstep(0.,.0013,abs(p.y-uTop.x-.022)));   // pesponto da barra
    diffuseColor.rgb=c; gMask=1.;
    gGlow=uTopB*1.4*(1.-smoothstep(0.,.022,abs(p.y-e)))*step(uWipeT,.995);
  } else if(bm>.5){
    float e=mix(uBot.y-.06,uBot.x+.06,uWipeB); vec3 c=p.y<e?uBotB:uBotA;
    float trim=step(uBot.x-.032,p.y)*.6;
    if(uBot.z>.5&&abs(vBN.x)>.94&&ax>.12&&p.y<uBot.x-.032) trim=1.;      // faixa lateral
    if(uBot.w>.5&&p.y<uBot.y+.045) trim=1.;
    c=mix(c,uBotAcc,trim);
    c*=1.-.2*(1.-smoothstep(0.,.0013,abs(p.y-uBot.y-.02)));
    diffuseColor.rgb=c; gMask=1.;
    gGlow=uBotB*1.4*(1.-smoothstep(0.,.022,abs(p.y-e)))*step(uWipeB,.995);
  }
}`;
const FRAG_BUMP = /* glsl */ `
if(gMask>.5){ // trama do tecido (relevo procedural que some à distância)
  float F=1700., fade=clamp(1.-fwidth(vBind.y)*F*.55,0.,1.);
  float h=(sin(vBind.x*F)*sin(vBind.y*F*1.3)+.6*sin((vBind.y+vBind.z)*F*.9))*fade;
  vec3 dpx=dFdx(-vViewPosition), dpy=dFdy(-vViewPosition); vec3 r1=cross(dpy,normal), r2=cross(normal,dpx); float det=dot(dpx,r1);
  normal=normalize(abs(det)*normal-.00045*sign(det)*(dFdx(h)*r1+dFdy(h)*r2));
}`;

const col = (h) => new THREE.Color(h);
const ease = (t) => 1 - Math.pow(1 - t, 3);
const V3 = THREE.Vector3;

export async function createFitting(canvas, onProgress = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(); scene.background = col('#191613'); scene.fog = new THREE.Fog('#191613', 9, 19);
  const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 40);

  // ---------- carregamento
  let done = 0; const tick = (p) => (done++, onProgress(done / 9), p);
  const gl = new GLTFLoader(), tl = new THREE.TextureLoader(), E = 'assets/env/';
  const tex = (f, rx, ry, srgb) => tl.loadAsync(E + f).then((t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return tick(t); });
  const [gm, gf, hdr, fD, fN, fR, wD, wN] = await Promise.all([
    gl.loadAsync('assets/models/manequim-m.glb').then(tick), gl.loadAsync('assets/models/manequim-f.glb').then(tick), new RGBELoader().loadAsync(E + 'studio.hdr').then(tick),
    tex('herringbone_parquet_diff.jpg', 9, 9, true), tex('herringbone_parquet_nor.jpg', 9, 9), tex('herringbone_parquet_rough.jpg', 9, 9),
    tex('beige_wall_001_diff.jpg', 5, 2, true), tex('beige_wall_001_nor.jpg', 5, 2),
  ]);
  scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(hdr).texture; hdr.dispose(); tick();
  scene.environmentIntensity = 0.55;

  // ---------- cenário: loja-estúdio
  const FLOOR = -0.14, std = (o) => new THREE.MeshStandardMaterial(o), brass = std({ color: 0xb48a4c, metalness: 1, roughness: 0.28 });
  const add = (geo, mat, x = 0, y = 0, z = 0, parent = scene) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  const floor = add(new THREE.PlaneGeometry(18, 18), std({ map: fD, normalMap: fN, roughnessMap: fR, roughness: 0.9, envMapIntensity: 0.7 }), 0, FLOOR, 0); floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
  const wallMat = std({ map: wD, normalMap: wN, color: 0xf3ece0, roughness: 0.92 });
  add(new THREE.PlaneGeometry(18, 6), wallMat, 0, FLOOR + 3, -3.4).castShadow = false;
  add(new THREE.BoxGeometry(18, 0.14, 0.04), std({ color: 0xf5f1e8, roughness: 0.5 }), 0, FLOOR + 0.07, -3.38);
  // painel ripado de madeira atrás do manequim
  const wood = std({ color: 0x8a5a36, roughness: 0.55 });
  for (let i = -9; i <= 9; i++) add(new THREE.BoxGeometry(0.075, 3.1, 0.05), wood, i * 0.115, FLOOR + 1.55, -3.34);
  // letreiro retroiluminado
  const sc = document.createElement('canvas'); sc.width = 1024; sc.height = 384;
  { const g = sc.getContext('2d'); g.textAlign = 'center'; g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = 26; const brand = (new URLSearchParams(location.search).get('marca') || 'PISTA').trim().slice(0, 28).toUpperCase(); let fz = 210;
    do { g.font = '800 ' + fz + 'px "Bricolage Grotesque", Arial'; fz -= 8; } while (g.measureText(brand).width > 960 && fz > 60);
    g.fillText(brand, 512, 215); sc.dataset.sub = brand === 'PISTA' ? 'athletic club' : 'provador 3D';
    g.font = '120px "Yellowtail", cursive'; g.fillStyle = '#ffb199'; g.shadowColor = '#ff6a3d'; g.fillText(sc.dataset.sub, 590, 330); }
  const signTex = new THREE.CanvasTexture(sc); signTex.colorSpace = THREE.SRGBColorSpace;
  const sign = add(new THREE.PlaneGeometry(1.7, 0.64), new THREE.MeshBasicMaterial({ map: signTex, transparent: true, toneMapped: false }), 0, 2.35, -3.3); sign.castShadow = sign.receiveShadow = false;
  // espelho de chão com moldura
  const mirror = new THREE.Group(); mirror.position.set(2.55, FLOOR, -3.05); mirror.rotation.set(-0.09, -0.32, 0); scene.add(mirror);
  const arch = (w, h) => { const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(-w / 2, h - w / 2); s.absarc(0, h - w / 2, w / 2, Math.PI, 0, true); s.lineTo(w / 2, 0); return s; };
  add(new THREE.ExtrudeGeometry(arch(0.98, 2.16), { depth: 0.05, bevelEnabled: false }), brass, 0, 0, -0.05, mirror);
  add(new THREE.ShapeGeometry(arch(0.9, 2.1), 32), std({ color: 0xdfe7ea, metalness: 0.55, roughness: 0.12, envMapIntensity: 2.2 }), 0, 0.02, 0.005, mirror).castShadow = false;
  // arara com peças penduradas
  const rack = new THREE.Group(); rack.position.set(-2.55, FLOOR, -2.55); rack.rotation.y = 0.3; scene.add(rack);
  const tube = (len, x, y, z, rz = 0, rx = 0) => { const m = add(new THREE.CylinderGeometry(0.016, 0.016, len, 14), brass, x, y, z, rack); m.rotation.set(rx, 0, rz); return m; };
  tube(1.7, -0.75, 0.85, 0); tube(1.7, 0.75, 0.85, 0); tube(1.56, 0, 1.68, 0, Math.PI / 2); tube(0.5, -0.75, 0.02, 0, 0, Math.PI / 2); tube(0.5, 0.75, 0.02, 0, 0, Math.PI / 2);
  const teeShape = new THREE.Shape(); [[-0.2, 0], [-0.2, -0.16], [-0.34, -0.24], [-0.4, -0.13], [-0.14, 0.06], [-0.07, 0.03], [0.07, 0.03], [0.14, 0.06], [0.4, -0.13], [0.34, -0.24], [0.2, -0.16], [0.2, -0.62], [-0.2, -0.62]].forEach(([x, y], i) => teeShape[i ? 'lineTo' : 'moveTo'](x, y));
  const teeGeo = new THREE.ExtrudeGeometry(teeShape, { depth: 0.035, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 });
  ['#e2492b', '#2a2a30', '#ece6d9', '#2f5bea', '#c6ea35', '#3f5f49', '#a48ad8'].forEach((c, i) => { const g = new THREE.Group(); g.position.set(-0.6 + i * 0.2, 1.6, 0); g.rotation.y = Math.PI / 2 + (i % 2 ? 0.08 : -0.06); rack.add(g);
    add(teeGeo, std({ color: c, roughness: 0.85 }), 0, 0, -0.017, g); const hk = add(new THREE.TorusGeometry(0.03, 0.005, 6, 16, Math.PI * 1.4), brass, 0, 0.085, 0, g); hk.rotation.z = -0.4; });
  // banco com peças dobradas
  const bench = new THREE.Group(); bench.position.set(2.1, FLOOR, -1.7); bench.rotation.y = -0.5; scene.add(bench);
  add(new THREE.BoxGeometry(1.1, 0.07, 0.4), wood, 0, 0.44, 0, bench); [[-0.48, -0.14], [0.48, -0.14], [-0.48, 0.14], [0.48, 0.14]].forEach(([x, z]) => add(new THREE.CylinderGeometry(0.018, 0.014, 0.42, 10), brass, x, 0.21, z, bench));
  ['#ece6d9', '#e2492b', '#2a2a30'].forEach((c, i) => add(new THREE.BoxGeometry(0.34 - i * 0.02, 0.045, 0.27), std({ color: c, roughness: 0.9 }), -0.25, 0.5 + i * 0.047, 0, bench));
  // pódio giratório
  const turn = new THREE.Group(); scene.add(turn);
  add(new THREE.CylinderGeometry(0.66, 0.68, 0.14, 96), std({ color: 0xf2ede3, roughness: 0.35 }), 0, -0.07, 0, turn);
  add(new THREE.TorusGeometry(0.662, 0.008, 10, 96), brass, 0, -0.004, 0, turn).rotation.x = Math.PI / 2;
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xe2492b, transparent: true, toneMapped: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.01, 8, 96), ringMat); ring.rotation.x = Math.PI / 2; ring.position.y = FLOOR + 0.012; scene.add(ring);

  // ---------- luz
  scene.add(new THREE.HemisphereLight(0xfff3e2, 0x5a4636, 0.35));
  const key = new THREE.SpotLight(0xfff0dc, 95, 14, 0.42, 0.55, 1.6); key.position.set(2.6, 5.2, 4.2); key.target.position.set(0, 0.9, 0); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0003; key.shadow.radius = 5; scene.add(key, key.target);
  const rim = new THREE.SpotLight(0xdfe9ff, 60, 12, 0.5, 0.7, 1.6); rim.position.set(-3.2, 3.6, -2.2); rim.target.position.set(0, 1.1, 0); scene.add(rim, rim.target);
  const wash = new THREE.PointLight(0xe2492b, 4.2, 6, 1.8); wash.position.set(0, 0.5, -2.7); scene.add(wash);          // banho de luz na cor da peça
  const glow = new THREE.PointLight(0xe2492b, 1.6, 2.2, 2); glow.position.set(0, FLOOR + 0.06, 0); scene.add(glow);

  // ---------- manequins
  const U = {
    uTop: { value: new THREE.Vector4() }, uBot: { value: new THREE.Vector4() }, uTopOn: { value: 0 }, uBotOn: { value: 0 }, uZip: { value: 0 },
    uTopA: { value: col('#888') }, uTopB: { value: col('#888') }, uTopAcc: { value: col('#111') }, uBotA: { value: col('#333') }, uBotB: { value: col('#333') }, uBotAcc: { value: col('#111') },
    uWipeT: { value: 1 }, uWipeB: { value: 1 }, uTopLoose: { value: 0 }, uBotLoose: { value: 0 }, uTopDrape: { value: 1 },
  };
  const strapMat = std({ color: 0x141416, roughness: 0.7 }), caseMat = std({ color: 0x2a2a2e, metalness: 0.95, roughness: 0.22 });
  const faceCv = document.createElement('canvas'); faceCv.width = faceCv.height = 256;
  const faceTex = new THREE.CanvasTexture(faceCv); faceTex.colorSpace = THREE.SRGBColorSpace;
  const drawFace = (accent) => { const g = faceCv.getContext('2d'); g.fillStyle = '#060607'; g.fillRect(0, 0, 256, 256); g.lineCap = 'round';
    [[100, accent, 0.78], [76, '#f4eee3', 0.6], [52, '#d3f23f', 0.9]].forEach(([r, c, f]) => { g.lineWidth = 15; g.globalAlpha = 0.22; g.strokeStyle = c; g.beginPath(); g.arc(128, 128, r, 0, 7); g.stroke();
      g.globalAlpha = 1; g.beginPath(); g.arc(128, 128, r, -1.57, -1.57 + 6.283 * f); g.stroke(); });
    g.fillStyle = '#fff'; g.beginPath(); g.arc(128, 128, 10, 0, 7); g.fill(); faceTex.needsUpdate = true; };
  const faceMat = std({ map: faceTex, emissiveMap: faceTex, emissive: 0xffffff, emissiveIntensity: 1.1, roughness: 0.08 });

  function setup(gltf, g) {
    const model = gltf.scene, bd = BODY[g], B = {}; turn.add(model); model.scale.setScalar(bd.scale);
    const own = { uSh: { value: bd.sh }, uNeck: { value: bd.neck },
      uEnvA: { value: new V3(bd.a[0], Math.max(bd.a[1], (bd.a[0] + bd.a[2]) * 0.47), bd.a[2]).multiplyScalar(1.04) },
      uEnvB: { value: new V3(...bd.z0.map((z, i) => (bd.z1[i] - z) / 2 * 1.1)) }, uEnvC: { value: new V3(...bd.z0.map((z, i) => (bd.z1[i] + z) / 2)) } };
    own.uEnvB.value.y = Math.max(own.uEnvB.value.y, (own.uEnvB.value.x + own.uEnvB.value.z) * 0.47);
    model.traverse((o) => {
      if (o.isBone) B[o.name] = o;
      if (!o.isMesh) return; o.castShadow = o.receiveShadow = true; o.frustumCulled = false;
      const m = new THREE.MeshPhysicalMaterial({ color: 0xe9e3d8, roughness: 0.46, clearcoat: 0.3, clearcoatRoughness: 0.38, sheen: 1, sheenRoughness: 0.5, sheenColor: 0x555049 });
      m.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, U, own);
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + HEAD + VERT)
          .replace('#include <beginnormal_vertex>', `float tm=topM(position,_arm), bm=(1.-tm)*botM(position,_arm), dk; vec3 dn;
            vec3 dp=drape(position,(tm*uTopDrape+bm)*(1.-step(.5,_arm.y)),dn,dk);
            vec3 gN=normalize(mix(normal,dn,dk)); vec3 objectNormal=gN;`)
          .replace('#include <begin_vertex>', `vBind=position; vArm=_arm; vBN=normal; vec3 transformed=dp+gN*(tm*uTopLoose+bm*uBotLoose);`);
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + HEAD + FRAG)
          .replace('#include <color_fragment>', '#include <color_fragment>\n' + FRAG_BODY)
          .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.78,gMask);')
          .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + FRAG_BUMP)
          .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance+=gGlow;')
          .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\nmaterial.clearcoat*=1.-gMask; material.sheenColor*=gMask;');
      };
      o.material = m;
    });
    // pose de descanso: mede a malha (pose em "A") e calcula quanto baixar braços e fechar pernas
    model.updateMatrixWorld(true);
    const wp = (n) => B[n].getWorldPosition(new V3()).divideScalar(bd.scale), R = { rootY: B.root.position.y };
    for (const [s, sg] of [['L', 1], ['R', -1]]) {
      const sh = wp('upperarm01_' + s), el = wp('lowerarm01_' + s), hip = wp('upperleg01_' + s), an = wp('foot_' + s);
      R['arm' + s] = -sg * (Math.atan2(Math.abs(el.x - sh.x), sh.y - el.y) - 0.17);
      R['leg' + s] = -sg * Math.atan2(Math.abs(an.x - hip.x), hip.y - an.y) * 0.82;
    }
    // relógio no pulso esquerdo
    const fa = B.lowerarm02_L || B.lowerarm01_L, w0 = wp('wrist_L'), e0 = wp('lowerarm01_L'), f0 = fa.getWorldPosition(new V3()).divideScalar(bd.scale);
    const axis = w0.clone().sub(e0).normalize(), upv = new V3(0, 1, 0).addScaledVector(axis, -axis.y).normalize(), side = new V3().crossVectors(upv, axis);
    const watch = new THREE.Group(); watch.visible = false; watch.position.copy(w0).sub(f0).addScaledVector(axis, -0.03);
    watch.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(side, upv, axis)); watch.scale.setScalar(g === 'f' ? 0.86 : 1);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.031, 0.0045, 12, 48), strapMat); strap.scale.set(1.05, 0.82, 2.4); strap.castShadow = true;
    const hd = new THREE.Group(); hd.position.y = 0.029;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.022, 0.011, 48), caseMat); body.castShadow = true;
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.0188, 48), faceMat); face.rotation.x = -Math.PI / 2; face.position.y = 0.0057;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.0033, 0.0033, 0.007, 12), caseMat); crown.rotation.z = Math.PI / 2; crown.position.x = 0.024;
    hd.add(body, face, crown); watch.add(strap, hd); fa.add(watch);
    return { model, B, R, watch };
  }
  const rigs = { m: setup(gm, 'm'), f: setup(gf, 'f') }; let cur = 'm'; rigs.f.model.visible = false;

  // animação procedural (sem arquivos): parado respira, caminha e corre no lugar
  const P = { ...MOTION.idle }; let motion = 'idle', ph = 0;
  function pose({ B, R }, t, dt) {
    const T = MOTION[motion], k = 1 - Math.exp(-dt * 5); for (const key in P) P[key] += (T[key] - P[key]) * k;
    ph += dt * P.w; const s = Math.sin(ph), c = Math.cos(ph), br = Math.sin(t * 1.5);
    for (const [sd, sg] of [['L', 1], ['R', -1]]) {
      const F = sg * s;
      B['upperleg01_' + sd].rotation.set(-P.A * F - P.lean * 0.4, 0, R['leg' + sd]);
      B['lowerleg01_' + sd].rotation.set(P.K * (0.1 + 0.9 * Math.max(0, sg * c)), 0, 0);
      B['foot_' + sd].rotation.set(P.A * 0.3 * F, 0, -R['leg' + sd]);
      B['upperarm01_' + sd].rotation.set(P.B * F + br * 0.012, 0, R['arm' + sd] + sg * br * 0.006);
      B['lowerarm01_' + sd].rotation.set(0.52 - P.El - P.B * 0.25 * Math.max(0, -F), 0, 0);
    }
    B.root.position.y = R.rootY + P.bob * Math.abs(c) - 0.5 * (1 - Math.cos(P.A * Math.abs(s)));
    B.spine04?.rotation.set(P.lean, -P.A * 0.16 * s, 0);
    B.spine02?.rotation.set(br * 0.012, P.A * 0.3 * s, 0);
    B.neck01?.rotation.set(-P.lean * 0.6, Math.sin(t * 0.45) * 0.05 * (1 - Math.min(1, P.A * 3)), 0);
  }

  // ---------- câmera e interação
  const st = { rot: 0.45, vel: 0, auto: 0.32, drag: false, lastUp: 0, focus: 'full', zoom: 1, pulse: 0, wipeT: 1, wipeB: 1 };
  const camNow = { x: 0, y: 0.95, z: 0, d: 7 }, wpos = new V3();
  const FOC = { full: [0.9, 5.5], top: [1.26, 3.0], bottom: [0.62, 3.4] };
  canvas.addEventListener('pointerdown', (e) => { st.drag = true; st.px = e.clientX; st.vel = 0; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => { if (!st.drag) return; const dx = e.clientX - st.px; st.px = e.clientX; st.rot += dx * 0.011; st.vel = dx * 0.011; });
  const up = () => { st.drag = false; st.lastUp = performance.now(); };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); st.zoom = THREE.MathUtils.clamp(st.zoom + e.deltaY * 0.0008, 0.55, 1.25); }, { passive: false });
  const resize = () => { const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(canvas);

  const clock = new THREE.Clock(); let running = false, time = 0;
  function frame() {
    if (!running) return; requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05), now = performance.now(); time += dt;
    const rg = rigs[cur]; pose(rg, time, dt);
    const wrist = st.focus === 'wrist';
    if (!st.drag) {
      st.rot += st.vel; st.vel *= 0.93;
      if (wrist) st.rot += (-1.0 + Math.sin(now / 1500) * 0.28 - st.rot) * (1 - Math.exp(-dt * 3));
      else if (now - st.lastUp > 1800) st.rot += st.auto * dt;
    }
    turn.rotation.y = st.rot;
    st.wipeT = Math.min(1, st.wipeT + dt * 1.5); st.wipeB = Math.min(1, st.wipeB + dt * 1.5);
    U.uWipeT.value = ease(st.wipeT); U.uWipeB.value = ease(st.wipeB);
    st.pulse *= Math.exp(-dt * 5); rg.model.scale.setScalar(BODY[cur].scale * (1 - st.pulse * 0.03));
    ring.scale.setScalar(1 + st.pulse * 0.22); ringMat.opacity = 0.75 + st.pulse * 0.25; glow.intensity = 1.6 + st.pulse * 5;
    let tx = 0, ty, tz = 0, d;
    if (wrist) { scene.updateMatrixWorld(); rg.B.wrist_L.getWorldPosition(wpos); tx = wpos.x; ty = wpos.y + 0.02; tz = wpos.z; d = 1.25; }
    else { [ty, d] = FOC[st.focus] || FOC.full; d *= Math.max(1, 0.6 / cam.aspect); }
    d *= st.zoom; const k = 1 - Math.exp(-dt * 4.5);
    camNow.x += (tx - camNow.x) * k; camNow.y += (ty - camNow.y) * k; camNow.z += (tz - camNow.z) * k; camNow.d += (d - camNow.d) * k;
    cam.position.set(camNow.x, camNow.y + camNow.d * 0.07, camNow.z + camNow.d); cam.lookAt(camNow.x, camNow.y, camNow.z);
    renderer.render(scene, cam);
  }
  const hero = (c) => { ringMat.color.set(c); wash.color.set(c); glow.color.set(c); };

  return {
    start() { if (running) return; running = true; clock.getDelta(); resize(); frame(); },
    stop() { running = false; },
    setGender(g) { if (g === cur) return; rigs[cur].model.visible = false; cur = g; rigs[g].model.visible = true; st.pulse = 1; },
    setFocus(f) { st.focus = f; st.zoom = 1; },
    setMotion(n) { if (MOTION[n]) motion = n; },
    pulse() { st.pulse = 1; },
    setRot(r) { st.rot = r; st.auto = 0; },
    // peça: { type, color, accent, fit } — fit de -2 (PP) a 2 (GG)
    setTop(g) {
      U.uTopOn.value = g ? 1 : 0; if (!g) return; const t = TOPS[g.type], fit = g.fit || 0;
      const same = U.uTop.value.y === t[1] && U.uTop.value.z === t[2] && U.uTop.value.w === t[3];
      U.uTop.value.set(t[0] - 0.008 * fit, t[1], t[2], t[3]); U.uTopLoose.value = t[4] + 0.0018 * fit; U.uTopDrape.value = t[5]; U.uZip.value = g.type === 'jacket' ? 1 : 0;
      U.uTopA.value.copy(same ? U.uTopB.value : col(g.color)); U.uTopB.value.set(g.color); U.uTopAcc.value.set(g.accent);
      if (!U.uTopA.value.equals(U.uTopB.value)) st.wipeT = 0; if (g.hero) hero(g.color);
    },
    setBottom(g) {
      U.uBotOn.value = g ? 1 : 0; if (!g) return; const t = BOTS[g.type], fit = g.fit || 0;
      const same = U.uBot.value.x === t[0] && U.uBot.value.z === t[2] && U.uBot.value.w === t[3];
      U.uBot.value.set(t[0], t[1] - (g.type === 'short' ? 0.012 * fit : 0), t[2], t[3]); U.uBotLoose.value = t[4] + 0.0018 * fit;
      U.uBotA.value.copy(same ? U.uBotB.value : col(g.color)); U.uBotB.value.set(g.color); U.uBotAcc.value.set(g.accent);
      if (!U.uBotA.value.equals(U.uBotB.value)) st.wipeB = 0; if (g.hero) hero(g.color);
    },
    setWatch(g) { for (const r of Object.values(rigs)) r.watch.visible = !!g; if (!g) return; strapMat.color.set(g.color); drawFace(g.color === '#141416' ? '#e2492b' : g.color);
      rigs.m.watch.scale.setScalar(g.fit > 0 ? 1.08 : 1); rigs.f.watch.scale.setScalar(g.fit > 0 ? 0.93 : 0.86); if (g.hero) hero(g.color); },
  };
}
