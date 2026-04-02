'use strict';
// ─────────────────────────────────────────────
// F1 PRO SIMULATOR — main.js (Three.js r160)
// ─────────────────────────────────────────────

const TEAMS = [
  { name: 'Scuderia Ferrari',  short: 'FER', color: '#e10600', cockpit: '#ff4400' },
  { name: 'Oracle Red Bull',   short: 'RBR', color: '#3671c6', cockpit: '#ffd700' },
  { name: 'Mercedes AMG',      short: 'MER', color: '#00d2be', cockpit: '#000000' },
  { name: 'McLaren F1',        short: 'MCL', color: '#ff8700', cockpit: '#000000' },
  { name: 'Aston Martin',      short: 'AMR', color: '#358c4e', cockpit: '#ffd700' },
  { name: 'Alpine F1',         short: 'ALP', color: '#0078ff', cockpit: '#ff0090' },
];

const SCALE = 4.0;
const TRACK_WIDTH = 24; 
const LAPS_TO_WIN = 5;

const CIRCUITS = {
  MONACO: [[0,0],[80,-18],[140,5],[175,60],[165,130],[120,185],[60,230],[0,270],[-60,290],[-110,275],[-130,215],[-115,150],[-75,110],[-20,90],[40,100],[100,130],[150,175],[175,220],[175,280],[140,330],[80,370],[10,390],[-70,368],[-105,300],[-95,210],[-55,130],[-20,60]],
  SILVERSTONE: [[0,0],[120,-5],[240,15],[330,80],[360,175],[340,270],[270,340],[160,375],[40,365],[-80,310],[-155,230],[-175,140],[-150,60],[-80,10]],
  MONZA: [[0,0],[180,-5],[340,0],[420,50],[440,150],[400,250],[310,310],[195,330],[90,305],[20,260],[-40,290],[-60,360],[-20,420],[90,440],[210,420],[330,440],[420,400],[450,330],[420,260],[330,230],[210,240],[110,265],[30,310],[-30,290],[-55,220],[-30,140],[20,70]],
  SPA: (function(){
    const raw = [[5.96502,50.444251],[5.963419,50.446033],[5.963473,50.446184],[5.963786,50.446188],[5.964313,50.446019],[5.966207,50.445387],[5.967421,50.444779],[5.967876,50.444463],[5.970321,50.442606],[5.971315,50.442168],[5.97141,50.441824],[5.97202,50.441069],[5.972268,50.440655],[5.973476,50.439424],[5.974245,50.438642],[5.974754,50.437784],[5.977199,50.432382],[5.977524,50.431331],[5.977406,50.431218],[5.977015,50.431048],[5.977027,50.429747],[5.97698,50.429469],[5.97663,50.429224],[5.973257,50.427739],[5.972831,50.427678],[5.972422,50.427805],[5.972239,50.42805],[5.972292,50.428305],[5.974216,50.429205],[5.97434,50.429431],[5.973712,50.430723],[5.972878,50.433452],[5.972724,50.433744],[5.972369,50.433999],[5.971872,50.434164],[5.970717,50.43423],[5.969759,50.434065],[5.969208,50.433782],[5.967231,50.430845],[5.966882,50.430534],[5.96622,50.43044],[5.965876,50.430421],[5.965325,50.430624],[5.964828,50.430713],[5.964094,50.430548],[5.962425,50.428927],[5.961922,50.428762],[5.960578,50.429257],[5.959756,50.429761],[5.959602,50.430209],[5.959862,50.430779],[5.960365,50.431463],[5.961247,50.43216],[5.962135,50.432712],[5.9631,50.433136],[5.965385,50.433895],[5.96632,50.434357],[5.966799,50.434744],[5.967107,50.435106],[5.967924,50.436261],[5.968095,50.43686],[5.967699,50.437624],[5.966888,50.438991],[5.966775,50.439273],[5.966604,50.439919],[5.966456,50.441404],[5.966651,50.44156],[5.96706,50.441541],[5.967296,50.441626],[5.96732,50.441701],[5.966533,50.442559]];
    return raw.map(p => [(p[0] - 5.96502) * 80000, (p[1] - 50.444251) * 125000]);
  }())
};

// ─────────────────────────────────────────────
// UTILS & PARTICLE HELPER
// ─────────────────────────────────────────────
const SMOKE_MAX = 50;
class ParticleSystem {
  constructor(scene) {
    this.scene = scene; this.pool = [];
    const geo = new THREE.PlaneGeometry(2, 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.4, depthWrite: false });
    for (let i=0; i<SMOKE_MAX; i++) {
      const p = new THREE.Mesh(geo, mat.clone());
      p.visible = false; this.scene.add(p); this.pool.push({ mesh: p, life: 0 });
    }
  }
  emit(x, y, z) {
    const p = this.pool.find(i => !i.mesh.visible);
    if (!p) return;
    p.mesh.position.set(x, y, z);
    p.mesh.rotation.x = -Math.PI/2;
    p.mesh.visible = true; p.life = 1.0;
  }
  update(dt) {
    this.pool.forEach(p => {
      if (!p.mesh.visible) return;
      p.life -= dt * 1.5;
      p.mesh.material.opacity = p.life * 0.4;
      p.mesh.scale.setScalar(1 + (1 - p.life) * 2);
      if (p.life <= 0) p.mesh.visible = false;
    });
  }
}

// ─────────────────────────────────────────────
// BUILD TRACK
// ─────────────────────────────────────────────
function buildTrack(scene, rawPts, circuitName) {
  const isSpa = circuitName === 'SPA';
  const sc    = isSpa ? 1 : SCALE;
  const pts   = rawPts.map(([x, z]) => new THREE.Vector3(x * sc, 0, z * sc));
  const curve = new THREE.CatmullRomCurve3(pts, true);
  const N     = isSpa ? 1200 : 800;
  const spline = curve.getSpacedPoints(N);

  // Cache spline points for fast physics lookup
  const cachedSpline = new Float32Array(spline.length * 3);
  for(let i=0; i<spline.length; i++) {
    cachedSpline[i*3] = spline[i].x;
    cachedSpline[i*3+1] = spline[i].y;
    cachedSpline[i*3+2] = spline[i].z;
  }

  // Asphalt with noise texture
  const ac = document.createElement('canvas'); ac.width = ac.height = 256;
  const ax = ac.getContext('2d');
  ax.fillStyle = '#1a1a1a'; ax.fillRect(0,0,256,256);
  for(let i=0; i<1200; i++) {
    ax.fillStyle = i<800 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.3)';
    ax.fillRect(Math.random()*256, Math.random()*256, 1, 1);
  }
  const tex = new THREE.CanvasTexture(ac);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(4, isSpa ? 120 : 60);

  const verts = [], uvs = [], idx = [];
  for(let i=0; i<=N; i++) {
    const p = spline[i % N], t = curve.getTangentAt((i % N) / N).normalize();
    const b = new THREE.Vector3().crossVectors(t, new THREE.Vector3(0,1,0)).normalize();
    verts.push(p.x + b.x * TRACK_WIDTH, 0.08, p.z + b.z * TRACK_WIDTH, p.x - b.x * TRACK_WIDTH, 0.08, p.z - b.z * TRACK_WIDTH);
    uvs.push(0, i / 8, 1, i / 8);
    if (i < N) { const j = i * 2; idx.push(j, j+1, j+2, j+1, j+3, j+2); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  scene.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 })));

  // Ground
  const gnd = new THREE.Mesh(new THREE.PlaneGeometry(30000, 30000), new THREE.MeshStandardMaterial({ color: 0x2a5a22, roughness: 1 }));
  gnd.rotation.x = -Math.PI / 2; gnd.position.y = -0.06; gnd.receiveShadow = true;
  scene.add(gnd);

  // Line & Finish
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(TRACK_WIDTH * 2.2, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  const t0 = curve.getTangentAt(0);
  fl.rotation.x = -Math.PI/2; fl.rotation.z = -Math.atan2(t0.x, t0.z);
  fl.position.set(spline[0].x, 0.12, spline[0].z); scene.add(fl);

  return { curve, spline, cachedSpline, N };
}

// ─────────────────────────────────────────────
// BUILD CAR MESH
// ─────────────────────────────────────────────
function buildCarMesh(team) {
  const group = new THREE.Group();
  const c = parseInt(team.color.replace('#',''), 16);
  const ck = parseInt(team.cockpit.replace('#',''), 16);
  const mat = col => new THREE.MeshStandardMaterial({ color: col, roughness: 0.3, metalness: 0.2 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.4, 5.2), mat(c));
  body.position.y = 0.5; body.castShadow = true; group.add(body);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.25, 2.2), mat(c));
  nose.position.set(0, 0.42, 3.4); group.add(nose);
  
  const hmat = new THREE.MeshStandardMaterial({ color: ck });
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), hmat);
  helmet.position.set(0, 1.1, 0.2); group.add(helmet);

  const wGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.6, 14);
  const wMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const fWheels = [], rWheels = [];
  const poses = [[-1.4, 0.25, 2.05], [1.4, 0.25, 2.05], [-1.4, 0.25, -2.05], [1.4, 0.25, -2.05]];
  poses.forEach((p, i) => {
    const pivot = new THREE.Group(); pivot.position.set(...p);
    const w = new THREE.Mesh(wGeo, wMat); w.rotation.z = Math.PI/2; pivot.add(w);
    group.add(pivot);
    if(i < 2) fWheels.push(pivot); else rWheels.push(pivot);
  });

  return { group, fWheels, rWheels };
}

// ─────────────────────────────────────────────
// CAR PHYSICS
// ─────────────────────────────────────────────
class CarPhysics {
  constructor(team, isPlayer, cachedSpline) {
    this.team = team; this.isPlayer = isPlayer; this.cachedSpline = cachedSpline;
    const { group, fWheels, rWheels } = buildCarMesh(team);
    this.mesh = group; this.fWheels = fWheels; this.rWheels = rWheels;

    this.x = 0; this.z = 0; this.angle = 0; this.speed = 0;
    this.gear = 1; this.tireWear = 1.0; this.damage = 0;
    this.lap = 1; this.progress = 0;
    this.drsActive = false; this.canUseDrs = false;
    this.steerAngle = 0;

    this.accel = isPlayer ? 180 : 130 + Math.random()*50;
    this.topSpeed = isPlayer ? 355 : 260 + Math.random()*70;
  }

  update(dt, keys) {
    if(!keys) return;
    const td = this.getTrackDist();
    const isOff = td > TRACK_WIDTH + 6;

    const dmgM = 1 - this.damage * 0.4;
    const topEff = (isOff ? 80 : this.topSpeed * dmgM) * (this.drsActive ? 1.15 : 1);
    const accEff = this.accel * (0.4 + this.tireWear*0.6) * dmgM * (isOff ? 0.2 : 1);

    if (keys.w) this.speed = Math.min(topEff, this.speed + accEff * dt);
    else if (keys.s) this.speed = Math.max(isOff ? -30 : -60, this.speed - 350 * dt);
    else this.speed *= Math.pow(0.985, dt * 60);

    const prev = { x: this.x, z: this.z };
    this.x += Math.sin(this.angle) * this.speed * dt;
    this.z += Math.cos(this.angle) * this.speed * dt;

    // Barrier Collision
    if (this.getTrackDist() > TRACK_WIDTH + 9 && Math.abs(this.speed) > 40) {
      this.x = prev.x; this.z = prev.z; this.speed *= 0.4;
      this.damage = Math.min(1, this.damage + 0.12);
    }

    // Dynamic Understeer Turning
    const sf = Math.min(1, Math.abs(this.speed)/80);
    const sl = 2.8 * (1 - Math.abs(this.speed)/360 * 0.55);
    const dir = this.speed < 0 ? -1 : 1;
    let targetSteer = 0;
    if (keys.a) targetSteer = 1; else if (keys.d) targetSteer = -1;
    this.steerAngle = THREE.MathUtils.lerp(this.steerAngle, targetSteer, dt * 8);
    this.angle += this.steerAngle * sl * sf * dir * dt;

    this.gear = Math.max(1, Math.floor(Math.abs(this.speed)/50) + 1);
    this.tireWear = Math.max(0, this.tireWear - 0.000008 * Math.abs(this.speed) * dt);

    // Anim: Suspension & Wheels
    this.mesh.position.set(this.x, 0.28 + Math.sin(performance.now()*0.012) * Math.abs(this.speed)*0.0001, this.z);
    this.mesh.rotation.y = this.angle;
    this.fWheels.forEach(f => {
      f.rotation.y = this.steerAngle * 0.45;
      f.children[0].rotation.x += this.speed * dt * 0.8;
    });
    this.rWheels.forEach(r => r.children[0].rotation.x += this.speed * dt * 0.8);
  }

  getTrackDist() {
    let minD = Infinity;
    for(let i=0; i < this.cachedSpline.length; i+=3) {
      const dx = this.cachedSpline[i] - this.x, dz = this.cachedSpline[i+2] - this.z;
      const d = dx*dx + dz*dz;
      if (d < minD) minD = d;
    }
    return Math.sqrt(minD);
  }
}

// ─────────────────────────────────────────────
// AI CONTROLLER
// ─────────────────────────────────────────────
class AIController {
  constructor(car, curve, index) {
    this.car = car; this.curve = curve;
    this.progress = index * 0.004;
    this.checkpoint = false; this.allowCheckpoint = false;
    this.speedTarget = 240 + Math.random() * 80;
    setTimeout(() => this.allowCheckpoint = true, 5000);
  }
  update(dt) {
    const car = this.car;
    let best = this.progress, bestD = Infinity;
    for (let i = 0; i <= 35; i++) {
        const u = ((this.progress - 0.06) + i / 35 * 0.12 + 1) % 1;
        const p = this.curve.getPointAt(u);
        const d = (p.x - car.x)**2 + (p.z - car.z)**2;
        if (d < bestD) { bestD = d; best = u; }
    }
    this.progress = best; car.progress = best;
    if (best > 0.5) this.checkpoint = true;
    if (best < 0.05 && this.checkpoint && this.allowCheckpoint) {
      car.lap++; this.checkpoint = false;
    }

    const future = this.curve.getPointAt((best + 0.035) % 1);
    const desired = Math.atan2(future.x - car.x, future.z - car.z);
    let diff = desired - car.angle;
    while(diff < -Math.PI) diff += Math.PI*2; while(diff > Math.PI) diff -= Math.PI*2;
    car.angle += diff * 4.5 * dt;

    if (car.speed < this.speedTarget) car.speed += 170 * dt;
    car.x += Math.sin(car.angle) * car.speed * dt; car.z += Math.cos(car.angle) * car.speed * dt;
    car.update(dt, {}); // Reuse mesh anim logic
  }
}

// ─────────────────────────────────────────────
// GAME
// ─────────────────────────────────────────────
class Game {
  constructor(team, circuitName) {
    this.racing = false; this.lapStart = performance.now();
    this.bestLap = Infinity; this.allCars = []; this.aiList = [];
    this.isSpa = circuitName === 'SPA';
    this.cameraMode = 'chase'; // 'chase' or 'cockpit'
    this.keys = { w:0, a:0, s:0, d:0, space:0 };

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.FogExp2(0x87ceeb, this.isSpa ? 0.00018 : 0.00035);

    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(300, 600, 200); sun.castShadow = true;
    const f = this.isSpa ? 2500 : 750;
    sun.shadow.camera.left = -f; sun.shadow.camera.right = f;
    sun.shadow.camera.top = f; sun.shadow.camera.bottom = -f;
    sun.shadow.mapSize.set(2048, 2048); this.scene.add(sun);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.45));

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    document.body.appendChild(this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera(65, innerWidth/innerHeight, 1, 8000);

    const track = buildTrack(this.scene, CIRCUITS[circuitName], circuitName);
    this.curve = track.curve; this.cachedSpline = track.cachedSpline;
    this.smoke = new ParticleSystem(this.scene);

    this.player = new CarPhysics(team, true, this.cachedSpline);
    const p0 = track.spline[0], t0 = this.curve.getTangentAt(0);
    this.player.x = p0.x; this.player.z = p0.z; this.player.angle = Math.atan2(t0.x, t0.z);
    this.scene.add(this.player.mesh); this.allCars.push(this.player);

    TEAMS.filter(t => t.name !== team.name).slice(0, 5).forEach((t, i) => {
      const car = new CarPhysics(t, false, this.cachedSpline);
      const row = Math.floor(i/2)+1, side = i%2===0?1:-1;
      const b = new THREE.Vector3().crossVectors(t0, new THREE.Vector3(0,1,0)).normalize();
      car.x = p0.x + b.x*side*7 - t0.x*row*16; car.z = p0.z + b.z*side*7 - t0.z*row*16; car.angle = this.player.angle;
      this.scene.add(car.mesh); this.allCars.push(car);
      this.aiList.push(new AIController(car, this.curve, i+1));
    });

    this._setupAudio();
    this._setupControls();
    this._lastPos = 1; this._lastTime = performance.now();
    this.animate();
  }

  _setupAudio() {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const g = ac.createGain(); g.gain.value = 0; g.connect(ac.destination);
    const o1 = ac.createOscillator(); o1.type = 'sawtooth'; o1.connect(g); o1.start();
    const o2 = ac.createOscillator(); o2.type = 'square'; o2.connect(g); o2.start(); o2.detune.value = 8;
    this._audio = { ac, g, o1, o2 };
  }

  _setupControls() {
    const k = this.keys;
    window.onkeydown = e => {
      const v = e.key.toLowerCase();
      if(v==='w'||e.key==='ArrowUp') k.w=1; if(v==='s'||e.key==='ArrowDown') k.s=1;
      if(v==='a'||e.key==='ArrowLeft') k.a=1; if(v==='d'||e.key==='ArrowRight') k.d=1;
      if(v===' ') k.space=1; if(v==='c') this.cameraMode = this.cameraMode==='chase'?'cockpit':'chase';
    };
    window.onkeyup = e => {
      const v = e.key.toLowerCase();
      if(v==='w'||e.key==='ArrowUp') k.w=0; if(v==='s'||e.key==='ArrowDown') k.s=0;
      if(v==='a'||e.key==='ArrowLeft') k.a=0; if(v==='d'||e.key==='ArrowRight') k.d=0;
      if(v===' ') k.space=0;
    };
    const b = (id, key) => {
      const el = document.getElementById(id); if(!el) return;
      el.ontouchstart = (e) => { k[key]=1; e.preventDefault(); }; el.ontouchend = (e) => { k[key]=0; e.preventDefault(); };
    };
    b('t-left','a'); b('t-right','d'); b('t-gas','w'); b('t-brake','s'); b('t-drs','space');
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const now = performance.now(), dt = Math.min((now - this._lastTime)/1000, 0.05);
    this._lastTime = now;

    if (this.racing) {
      this.checkLap(); // Set player.drsActive & progress
      this.player.update(dt, this.keys);
      this.aiList.forEach(ai => ai.update(dt));
      this.handleCollisions(dt);
      if(this.player.getTrackDist() > TRACK_WIDTH + 6 && Math.abs(this.player.speed) > 100) {
        this.smoke.emit(this.player.x, 0.2, this.player.z);
      }
    }
    this.smoke.update(dt);
    this.updateHUD();
    this.updateAudio();
    this.updateCamera();
    this.renderer.render(this.scene, this.camera);
  }

  handleCollisions(dt) {
    for(let i=0; i<this.allCars.length; i++) {
      for(let j=i+1; j<this.allCars.length; j++) {
        const c1 = this.allCars[i], c2 = this.allCars[j];
        const dx = c2.x - c1.x, dz = c2.z - c1.z, distSq = dx*dx + dz*dz;
        if(distSq < 18) {
          const dist = Math.sqrt(distSq) || 0.1;
          const nx = dx/dist, nz = dz/dist;
          const push = (4.2 - dist) / 2;
          c1.x -= nx * push; c1.z -= nz * push; c2.x += nx * push; c2.z += nz * push;
          c1.speed *= 0.7; c2.speed *= 0.7;
        }
      }
    }
  }

  checkLap() {
    const p = this.player, s0 = this.curve.getPointAt(0);
    const threshold = this.isSpa ? 140 : 80;
    const dist = Math.sqrt((p.x-s0.x)**2 + (p.z-s0.z)**2);
    const near = dist < threshold;
    if (near && !this._near) {
      this._near = true;
      if (this._started) {
        p.lap++; this.lapStart = performance.now();
        const msg = document.getElementById('lap-msg');
        msg.innerText = `LAP ${p.lap}`; msg.style.opacity = 1; setTimeout(() => msg.style.opacity = 0, 2000);
        if(p.lap > LAPS_TO_WIN) location.reload();
      } else this._started = true;
    } else if (!near) this._near = false;

    let best = p.progress || 0, bestD = Infinity;
    for (let i = 0; i <= 40; i++) {
        const u = ((p.progress - 0.06) + i / 40 * 0.12 + 1) % 1;
        const cp = this.curve.getPointAt(u);
        const dd = (cp.x - p.x)**2 + (cp.z - p.z)**2;
        if (dd < bestD) { bestD = dd; best = u; }
    }
    p.progress = best;
    p.canUseDrs = (best > 0.05 && best < 0.25) || (best > 0.55 && best < 0.75);
    p.drsActive = this.keys.space && p.canUseDrs;
  }

  updateHUD() {
    const p = this.player, el = id => document.getElementById(id);
    el('speed').innerText = Math.floor(Math.abs(p.speed));
    el('gear').innerText = p.gear;
    el('rpm-bar').style.width = Math.min(100, (Math.abs(p.speed)%70)*1.5) + '%';
    
    const sorted = [...this.allCars].sort((a,b) => b.lap - a.lap || b.progress - a.progress);
    const pos = sorted.indexOf(p) + 1;
    if(pos < this._lastPos) {
       const ov = el('overtake-msg'); ov.style.opacity = 1; setTimeout(()=>ov.style.opacity=0, 2000);
    }
    this._lastPos = pos;
    el('pos').innerText = `POS: ${pos}${pos===1?'st':pos===2?'nd':pos===3?'rd':'th'}`;
    
    el('lb-rows').innerHTML = sorted.map((car, i) => {
      const gap = i === 0 ? 'LEADER' : `+${((sorted[0].lap - car.lap + sorted[0].progress - car.progress)*110).toFixed(1)}s`;
      return `<div style="display:flex;justify-content:space-between;color:${car===p?'#fff':'#888'}"><span>P${i+1} ${car.team.short}</span><span>${gap}</span></div>`;
    }).join('');
    
    const elapsed = this._started ? (performance.now()-this.lapStart)/1000 : 0;
    const f = t => `${Math.floor(t/60).toString().padStart(2,'0')}:${Math.floor(t%60).toString().padStart(2,'0')}.${Math.floor((t%1)*1000).toString().padStart(3,'0')}`;
    el('hud-timer').innerText = f(elapsed);
    el('lap').innerText = `${p.lap}/${LAPS_TO_WIN}`;
  }

  updateAudio() {
    if(!this._audio) return;
    const { ac, g, o1, o2 } = this._audio;
    if(!this.racing) { g.gain.setTargetAtTime(0, ac.currentTime, 0.1); return; }
    g.gain.setTargetAtTime(0.04, ac.currentTime, 0.1);
    const freq = 60 + Math.abs(this.player.speed)*2.2 + this.player.gear*12;
    o1.frequency.setTargetAtTime(freq, ac.currentTime, 0.08);
    o2.frequency.setTargetAtTime(freq, ac.currentTime, 0.08);
  }

  updateCamera() {
    const p = this.player;
    if(this.cameraMode === 'chase') {
      const cx = p.x - Math.sin(p.angle)*38, cz = p.z - Math.cos(p.angle)*38;
      this.camera.position.lerp(new THREE.Vector3(cx, 14, cz), 0.1);
      this.camera.lookAt(p.x + Math.sin(p.angle)*12, 2, p.z + Math.cos(p.angle)*12);
    } else {
      this.camera.position.set(p.x, 1.2, p.z);
      this.camera.lookAt(p.x + Math.sin(p.angle)*50, 1.2, p.z + Math.cos(p.angle)*50);
    }
  }
}

// ─────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────
(function init() {
  const tc = document.getElementById('team-cards'), cc = document.getElementById('circuit-cards'), sb = document.getElementById('start-btn'), cl = document.getElementById('circuit-label');
  let selT, selC;

  TEAMS.forEach(t => {
    const d = document.createElement('div'); d.className='card'; d.innerHTML=`<div class="card-color" style="background:${t.color}"></div><div class="card-short">${t.short}</div><div class="card-name">${t.name}</div>`;
    d.onclick = () => {
      [...tc.children].forEach(c=>c.classList.remove('selected')); d.classList.add('selected');
      selT = t; cl.style.display = 'block'; cc.style.display = 'flex';
    };
    tc.appendChild(d);
  });

  Object.keys(CIRCUITS).forEach(c => {
    const d = document.createElement('div'); d.className='card'; d.innerHTML=`<div class="card-short" style="font-size:0.8rem">${c}</div><div class="card-name">GP Circuit</div>`;
    d.onclick = () => { [...cc.children].forEach(c=>c.classList.remove('selected')); d.classList.add('selected'); selC=c; sb.style.display='block'; };
    cc.appendChild(d);
  });

  sb.onclick = () => {
    document.getElementById('overlay').style.display='none';
    const ov = document.getElementById('countdown-overlay'); ov.style.display='flex';
    const game = new Game(selT, selC);
    let step = 0;
    const iv = setInterval(() => {
      if(step < 5) {
        document.getElementById(`l${++step}`).classList.add('active');
      } else {
        clearInterval(iv);
        document.querySelectorAll('.light-unit').forEach(l => { l.classList.remove('active'); l.classList.add('go'); });
        document.getElementById('countdown-text').innerText = 'GO!';
        setTimeout(() => { ov.style.display='none'; document.getElementById('hud').style.display='block'; game.racing=true; }, 800);
      }
    }, 1000);
  };
})();
