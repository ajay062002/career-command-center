// F1 Grand Prix 3D Simulator — Main Logic
// Uses global THREE from script tag

const TEAMS = [
  { name: 'Scuderia Ferrari',  short: 'FER', color: '#e10600', cockpit: '#ff4400' },
  { name: 'Oracle Red Bull',   short: 'RBR', color: '#3671c6', cockpit: '#ffd700' },
  { name: 'Mercedes AMG',      short: 'MER', color: '#00d2be', cockpit: '#000000' },
  { name: 'McLaren F1',        short: 'MCL', color: '#ff8700', cockpit: '#000000' },
  { name: 'Aston Martin',      short: 'AMR', color: '#358c4e', cockpit: '#ffd700' },
  { name: 'Alpine F1',         short: 'ALP', color: '#0078ff', cockpit: '#ff0090' },
];

const CIRCUITS = {
  MONACO: [[0,0], [120,0], [240,60], [300,180], [280,320], [200,440], [80,500], [-80,480], [-200,380], [-260,220], [-220,80], [-100,10]],
  SILVERSTONE: [[0,0], [160,20], [320,80], [420,200], [400,360], [280,460], [120,480], [-60,420], [-180,300], [-200,140], [-100,40]],
  MONZA: [[0,0], [300,0], [460,80], [480,220], [400,360], [200,420], [0,400], [-160,320], [-200,160], [-100,40]],
};

const LAPS_TO_WIN = 5;
const SCALE = 2.5;
const TRACK_WIDTH = 22;

// ─────────────────────────────────────────────
// 1. CAR PHYSICS
// ─────────────────────────────────────────────
class CarPhysics {
  constructor(team, isPlayer) {
    this.team = team;
    this.isPlayer = isPlayer;
    this.mesh = this.buildMesh(team);
    
    this.x = 0; this.z = 0; this.angle = 0;
    this.speed = 0;
    this.gear = 1;
    this.tireWear = 1.0;
    this.damage = 0;
    this.lap = 1;
    this.progress = 0;
    this.drsActive = false;
    this.canUseDrs = false;
    this.sectorTimes = [0,0,0];
    this.lastSectorProgress = 0;
  }

  buildMesh(team) {
    const group = new THREE.Group();
    const c = team.color;
    const mat = (col) => new THREE.MeshStandardMaterial({ color: col, roughness: 0.4 });
    
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2, 0.4, 4.8), mat(c));
    chassis.position.y = 0.5; chassis.castShadow = true; group.add(chassis);
    
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 1.8), mat(c));
    nose.position.set(0, 0.45, 3.2); group.add(nose);
    
    const fw = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.1, 0.6), mat(c));
    fw.position.set(0, 0.2, 3.6); group.add(fw);
    
    const rw = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.1, 0.5), mat(c));
    rw.position.set(0, 1.1, -2.2); group.add(rw);
    
    const wGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.6, 12);
    const wMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    this.wheels = [];
    [[-1.3,0.25,1.8],[1.3,0.25,1.8],[-1.3,0.25,-1.8],[1.3,0.25,-1.8]].forEach(p => {
      const w = new THREE.Mesh(wGeo, wMat);
      w.rotation.z = Math.PI/2; w.position.set(...p); group.add(w);
      this.wheels.push(w);
    });
    
    return group;
  }

  update(dt, keys) {
    if (!keys) return;
    const trackDist = this.getTrackDist();
    const isOff = trackDist > TRACK_WIDTH + 4;
    
    // Accel/Brake
    const top = (isOff ? 60 : 280) * (this.drsActive ? 1.15 : 1.0) * (1 - this.damage*0.5);
    const effectiveAccel = 140 * (isOff ? 0.3 : 1.0) * (0.3 + this.tireWear*0.7);
    
    if (keys.w) this.speed = Math.min(top, this.speed + effectiveAccel * dt);
    else if (keys.s) this.speed = Math.max(-40, this.speed - 280 * dt);
    else this.speed *= Math.pow(0.98, dt * 60);

    // Steer
    const sf = Math.min(1, Math.abs(this.speed)/60);
    const dir = this.speed < 0 ? -1 : 1;
    if (keys.a) this.angle += 2.2 * sf * dir * dt;
    if (keys.d) this.angle -= 2.2 * sf * dir * dt;

    // Move & Collision
    const px = this.x, pz = this.z;
    this.x += Math.sin(this.angle) * this.speed * dt;
    this.z += Math.cos(this.angle) * this.speed * dt;

    if (trackDist > TRACK_WIDTH + 6 && Math.abs(this.speed) > 40) {
      this.speed *= 0.4; this.damage = Math.min(1, this.damage+0.1); this.x = px; this.z = pz;
    }
    if (isOff && this.speed > 100) this.damage = Math.min(1, this.damage+0.02*dt);

    this.mesh.position.set(this.x, 0.28, this.z);
    this.mesh.rotation.y = this.angle;
    this.wheels.forEach(w => w.rotation.x += this.speed*dt*0.5);
    this.tireWear = Math.max(0, this.tireWear - 0.000002 * Math.abs(this.speed));
  }

  getTrackDist() {
    if (!window._curve) return 0;
    let minD = Infinity;
    for(let i=0; i<=50; i++) {
      const p = window._curve.getPointAt(i/50);
      const d = (p.x-this.x)**2 + (p.z-this.z)**2;
      if (d < minD) minD = d;
    }
    return Math.sqrt(minD);
  }
}

// ─────────────────────────────────────────────
// 2. GAME CLASS
// ─────────────────────────────────────────────
class Game {
  constructor(team, circuitName) {
    this.racing = false;
    this.lapStart = 0;
    this.allCars = [];
    this.keys = { w:0,a:0,s:0,d:0,space:0 };

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.0008);
    
    const amb = new THREE.AmbientLight(0xffffff, 0.5); this.scene.add(amb);
    const sun = new THREE.DirectionalLight(0xffffff, 1.2); sun.position.set(100,200,50); this.scene.add(sun);

    this.camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 1, 4000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(innerWidth, innerHeight);
    document.body.appendChild(this.renderer.domElement);

    // Track
    const raw = CIRCUITS[circuitName];
    const pts = raw.map(p => new THREE.Vector3(p[0]*SCALE, 0, p[1]*SCALE));
    this.curve = new THREE.CatmullRomCurve3(pts, true);
    window._curve = this.curve;
    
    // Ribbon
    const spline = this.curve.getSpacedPoints(400);
    const verts = [], idx = [];
    for(let i=0; i<=400; i++) {
        const p = spline[i%400], t = this.curve.getTangentAt((i%400)/400).normalize();
        const b = new THREE.Vector3().crossVectors(t, new THREE.Vector3(0,1,0)).normalize();
        const L = p.clone().addScaledVector(b, TRACK_WIDTH), R = p.clone().addScaledVector(b, -TRACK_WIDTH);
        verts.push(L.x, 0.1, L.z, R.x, 0.1, R.z);
        if (i < 400) { const j=i*2; idx.push(j,j+1,j+2, j+1,j+3,j+2); }
    }
    const trackGeo = new THREE.BufferGeometry();
    trackGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    trackGeo.setIndex(idx);
    this.scene.add(new THREE.Mesh(trackGeo, new THREE.MeshStandardMaterial({ color: 0x222222 })));
    
    // Plane
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(10000,10000), new THREE.MeshStandardMaterial({ color: 0x3a5a2a }));
    ground.rotation.x = -Math.PI/2; ground.position.y = 0; this.scene.add(ground);

    // Players
    this.player = new CarPhysics(team, true);
    const p0 = spline[0], t0 = this.curve.getTangentAt(0);
    this.player.x = p0.x; this.player.z = p0.z; this.player.angle = Math.atan2(t0.x, t0.z);
    this.scene.add(this.player.mesh);
    this.allCars.push(this.player);

    // AI
    const others = TEAMS.filter(t => t.name !== team.name).slice(0, 5);
    others.forEach((t, i) => {
      const car = new CarPhysics(t, false);
      car.x = p0.x - t0.x*15*(i+1); car.z = p0.z - t0.z*15*(i+1); car.angle = this.player.angle;
      this.scene.add(car.mesh); this.allCars.push(car);
    });

    this.setupControls();
    this.animate();
  }

  setupControls() {
    const k = this.keys;
    window.onkeydown = (e) => {
      const v = e.key.toLowerCase();
      if(v==='w'||e.key==='ArrowUp') k.w=1; if(v==='s'||e.key==='ArrowDown') k.s=1;
      if(v==='a'||e.key==='ArrowLeft') k.a=1; if(v==='d'||e.key==='ArrowRight') k.d=1;
      if(e.key===' ') k.space=1;
    };
    window.onkeyup = (e) => {
      const v = e.key.toLowerCase();
      if(v==='w'||e.key==='ArrowUp') k.w=0; if(v==='s'||e.key==='ArrowDown') k.s=0;
      if(v==='a'||e.key==='ArrowLeft') k.a=0; if(v==='d'||e.key==='ArrowRight') k.d=0;
      if(e.key===' ') k.space=0;
    };
    const bind = (id, key) => {
      const el = document.getElementById(id); if(!el) return;
      el.ontouchstart = (e) => { k[key]=1; e.preventDefault(); };
      el.ontouchend = (e) => { k[key]=0; e.preventDefault(); };
      el.onmousedown = () => k[key]=1; el.onmouseup = () => k[key]=0;
    };
    bind('t-left','a'); bind('t-right','d'); bind('t-gas','w'); bind('t-brake','s'); bind('t-drs','space');
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const now = performance.now();
    const dt = 0.016; 
    
    if (this.racing) {
      this.player.drsActive = this.keys.space && this.player.canUseDrs;
      this.player.update(dt, this.keys);
      this.allCars.forEach((c,i) => { if(i>0) this.updateAI(c, dt); });
      this.checkLap();
    }

    this.updateHUD();
    this.updateCamera();
    this.renderer.render(this.scene, this.camera);
  }

  updateAI(car, dt) {
    let minD = Infinity, bestU = car.progress || 0;
    for(let i=0; i<10; i++) {
      const u = (bestU + (i/100) + 1)%1; const p = this.curve.getPointAt(u);
      const d = (p.x-car.x)**2 + (p.z-car.z)**2; if(d<minD){ minD=d; bestU=u; }
    }
    car.progress = bestU;
    const target = this.curve.getPointAt((bestU + 0.03)%1);
    const ang = Math.atan2(target.x-car.x, target.z-car.z);
    let diff = ang - car.angle;
    while(diff < -Math.PI) diff += Math.PI*2; while(diff > Math.PI) diff -= Math.PI*2;
    car.angle += diff * 3 * dt;
    car.speed = Math.min(220, car.speed + 100*dt);
    car.x += Math.sin(car.angle)*car.speed*dt; car.z += Math.cos(car.angle)*car.speed*dt;
    car.mesh.position.set(car.x, 0.28, car.z); car.mesh.rotation.y = car.angle;
  }

  checkLap() {
    const p = this.player, start = this.curve.getPointAt(0);
    const d = Math.sqrt((p.x-start.x)**2 + (p.z-start.z)**2);
    const near = d < 40;
    if (near && !this._near) {
       this._near = true;
       if (this._started) {
         p.lap++; if(p.lap > LAPS_TO_WIN) location.reload();
         const msg = document.getElementById('lap-msg'); msg.innerText=`LAP ${p.lap}`; msg.style.opacity=1;
         setTimeout(()=>msg.style.opacity=0, 2000);
       }
       this._started = true; this.lapStart = performance.now();
    } else if(!near) this._near = false;
    
    // Progress for DRS (simple)
    let minD = Infinity, best = p.progress || 0;
    for(let i=0; i<20; i++){
      const u = (best - 0.05 + (i/20)*0.1 + 1)%1; const cp = this.curve.getPointAt(u);
      const d = (cp.x-p.x)**2 + (cp.z-p.z)**2; if(d<minD){ minD=d; best=u; }
    }
    p.progress = best;
    p.canUseDrs = (best > 0.1 && best < 0.3) || (best > 0.6 && best < 0.8);
  }

  updateHUD() {
    const p = this.player;
    document.getElementById('speed').innerText = Math.floor(p.speed);
    document.getElementById('gear').innerText = p.gear;
    document.getElementById('rpm-bar').style.width = (p.speed % 100) + '%';
    document.getElementById('drs-msg').innerText = p.drsActive ? 'DRS ACTIVE' : p.canUseDrs ? 'DRS AVAILABLE' : 'DRS LOCKED';
    document.getElementById('drs-msg').style.color = p.drsActive ? '#0f0' : p.canUseDrs ? '#ff0' : '#555';
    
    const elapsed = this.racing ? (performance.now() - this.lapStart)/1000 : 0;
    const mm = Math.floor(elapsed/60).toString().padStart(2,'0'), ss = Math.floor(elapsed%60).toString().padStart(2,'0'), ms = Math.floor((elapsed%1)*1000).toString().padStart(3,'0');
    document.getElementById('hud-timer').innerText = `${mm}:${ss}.${ms}`;
    document.getElementById('lap').innerText = `${p.lap}/${LAPS_TO_WIN}`;
    document.getElementById('dmg').innerText = `${Math.floor(p.damage*100)}%`;
    
    for(let i=0; i<4; i++) document.getElementById(`t${i}`).style.background = `rgb(${Math.floor((1-p.tireWear)*255)},${Math.floor(p.tireWear*255)},0)`;
    
    const sorted = [...this.allCars].sort((a,b) => b.lap - a.lap || b.progress - a.progress);
    const pos = sorted.indexOf(p) + 1;
    document.getElementById('pos').innerText = `POS: ${pos}${pos===1?'st':pos===2?'nd':pos===3?'rd':'th'}`;
    document.getElementById('lb-rows').innerHTML = sorted.map((c,i) => `<div style="display:flex; justify-content:space-between; color:${c===this.player?'#fff':'#888'}"><span>P${i+1} ${c.team.short}</span><span>${i===0?'LEADER':'+'+((sorted[0].progress-c.progress)*10).toFixed(1)+'s'}</span></div>`).join('');
  }

  updateCamera() {
    const p = this.player;
    const cx = p.x - Math.sin(p.angle)*20, cz = p.z - Math.cos(p.angle)*20;
    this.camera.position.lerp(new THREE.Vector3(cx, 10, cz), 0.1);
    this.camera.lookAt(p.x, 2, p.z);
  }
}

// ─────────────────────────────────────────────
// 3. BOOT
// ─────────────────────────────────────────────
(function init() {
  const tc = document.getElementById('team-cards'), cc = document.getElementById('circuit-cards'), sb = document.getElementById('start-btn');
  let selT, selC;

  TEAMS.forEach(t => {
    const d = document.createElement('div'); d.className='card'; d.innerHTML=`<div class="card-color" style="background:${t.color}"></div><div class="card-short">${t.short}</div><div class="card-name">${t.name}</div>`;
    d.onclick = () => { [...tc.children].forEach(c=>c.classList.remove('selected')); d.classList.add('selected'); selT=t; check(); };
    tc.appendChild(d);
  });

  Object.keys(CIRCUITS).forEach(c => {
    const d = document.createElement('div'); d.className='card'; d.innerHTML=`<div class="card-short" style="font-size:0.9rem">${c}</div><div class="card-name">Grand Prix</div>`;
    d.onclick = () => { [...cc.children].forEach(c=>c.classList.remove('selected')); d.classList.add('selected'); selC=c; check(); };
    cc.appendChild(d);
  });

  function check() { if(selT && selC) sb.style.display='block'; }

  sb.onclick = () => {
    document.getElementById('overlay').style.display='none';
    const ov = document.getElementById('countdown-overlay'), txt = document.getElementById('countdown-text');
    ov.style.display='flex';
    let count = 3, colors = ['#f00','#f80','#ff0','#0f0'], words = ['3','2','1','GO!'];
    const itv = setInterval(() => {
      if(count >= 0) {
        txt.innerText = words[3-count]; txt.style.color = colors[3-count];
        txt.style.animation = 'none'; txt.offsetHeight; txt.style.animation = 'countPulse 1s forwards';
        count--;
      } else {
        clearInterval(itv); ov.style.display='none';
        document.getElementById('hud').style.display='block';
        const game = new Game(selT, selC); game.racing = true;
      }
    }, 1000);
  };
})();
