const TEAMS = [
  { name: 'Scuderia Ferrari',  short: 'FER', color: '#e10600', cockpit: '#ff4400' },
  { name: 'Oracle Red Bull',   short: 'RBR', color: '#3671c6', cockpit: '#ffd700' },
  { name: 'Mercedes AMG',      short: 'MER', color: '#00d2be', cockpit: '#000000' },
  { name: 'McLaren F1',        short: 'MCL', color: '#ff8700', cockpit: '#000000' },
  { name: 'Aston Martin',      short: 'AMR', color: '#358c4e', cockpit: '#ffd700' },
  { name: 'Alpine F1',         short: 'ALP', color: '#0078ff', cockpit: '#ff0090' },
];

const SPA_RAW = [[5.96502,50.444251],[5.963419,50.446033],[5.963402,50.446113],[5.963473,50.446184],[5.963621,50.446217],[5.963786,50.446188],[5.964313,50.446019],[5.965592,50.445628],[5.966207,50.445387],[5.966847,50.445085],[5.967421,50.444779],[5.967876,50.444463],[5.970321,50.442606],[5.970493,50.442502],[5.970788,50.442385],[5.971315,50.442168],[5.971546,50.442022],[5.97141,50.441824],[5.971866,50.441644],[5.971949,50.441442],[5.97202,50.441069],[5.972061,50.440937],[5.972132,50.440815],[5.972268,50.440655],[5.973476,50.439424],[5.974245,50.438642],[5.974458,50.43835],[5.974594,50.438133],[5.974754,50.437784],[5.975719,50.435639],[5.977199,50.432382],[5.977542,50.431599],[5.97756,50.431472],[5.977524,50.431331],[5.977406,50.431218],[5.977234,50.431123],[5.977015,50.431048],[5.977033,50.429747],[5.977027,50.429601],[5.97698,50.429469],[5.97682,50.429323],[5.97663,50.429224],[5.973257,50.427739],[5.973044,50.427682],[5.972831,50.427678],[5.972606,50.42772],[5.972422,50.427805],[5.972292,50.427927],[5.972239,50.42805],[5.972227,50.428182],[5.972292,50.428305],[5.97241,50.428432],[5.972582,50.428521],[5.974056,50.429101],[5.974216,50.429205],[5.974304,50.429309],[5.97434,50.429431],[5.974322,50.429582],[5.973712,50.430723],[5.973523,50.431189],[5.973091,50.432627],[5.972878,50.433452],[5.972831,50.433593],[5.972724,50.433744],[5.972582,50.433867],[5.972369,50.433999],[5.972132,50.434098],[5.971872,50.434164],[5.971599,50.434192],[5.970717,50.43423],[5.97038,50.434206],[5.970072,50.43415],[5.969759,50.434065],[5.969504,50.433956],[5.969208,50.433782],[5.969019,50.433608],[5.968812,50.433358],[5.967977,50.432028],[5.967231,50.430845],[5.967071,50.430661],[5.966882,50.430534],[5.96622,50.43044],[5.966119,50.430388],[5.965876,50.430421],[5.965669,50.430482],[5.965325,50.430624],[5.9651,50.430685],[5.964828,50.430713],[5.964556,50.430694],[5.964307,50.430643],[5.964094,50.430548],[5.963958,50.43044],[5.963792,50.430294],[5.962425,50.428927],[5.962289,50.428847],[5.962123,50.42879],[5.961922,50.428762],[5.961697,50.428771],[5.961502,50.428828],[5.960578,50.429257],[5.960034,50.429511],[5.959898,50.429624],[5.959756,50.429761],[5.959673,50.429893],[5.959614,50.430049],[5.959602,50.430209],[5.959643,50.430402],[5.959738,50.430567],[5.959862,50.430779],[5.960046,50.4311],[5.960365,50.431463],[5.960715,50.431779],[5.961247,50.43216],[5.962135,50.432712],[5.962656,50.432971],[5.9631,50.433136],[5.965385,50.433895],[5.965716,50.434027],[5.96603,50.434183],[5.96632,50.434357],[5.966568,50.434546],[5.966799,50.434744],[5.967107,50.435106],[5.967356,50.435455],[5.967924,50.436261],[5.968024,50.436436],[5.968084,50.436624],[5.968095,50.43686],[5.968036,50.437072],[5.967699,50.437624],[5.967332,50.438232],[5.966888,50.438991],[5.966775,50.439273],[5.966669,50.439608],[5.966604,50.439919],[5.966562,50.440183],[5.966432,50.441404],[5.966456,50.441484],[5.966533,50.441541],[5.966651,50.44156],[5.966852,50.441541],[5.96706,50.441541],[5.967202,50.44156],[5.967296,50.441626],[5.96732,50.441701],[5.967261,50.4418],[5.966533,50.442559],[5.96502,50.444251]];
const SPA_PTS = SPA_RAW.map(p => [(p[0] - 5.96502) * 71000, (p[1] - 50.444251) * 111000]);

const CIRCUITS = {
  SPA_BELGIUM: SPA_PTS,
  MONACO: [[0,0], [120,0], [240,60], [300,180], [280,320], [200,440], [80,500], [-80,480], [-200,380], [-260,220], [-220,80], [-100,10]],
  SILVERSTONE: [[0,0], [160,20], [320,80], [420,200], [400,360], [280,460], [120,480], [-60,420], [-180,300], [-200,140], [-100,40]],
  MONZA: [[0,0], [300,0], [460,80], [480,220], [400,360], [200,420], [0,400], [-160,320], [-200,160], [-100,40]],
};

const LAPS_TO_WIN = 5;
const SCALE = 3.5; // Bumped overall scale as requested for 'as big as F1 tracks'
const TRACK_WIDTH = 25; // Wider for higher speeds

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
    
    // Low-poly F1 look
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
    const isOff = trackDist > TRACK_WIDTH + 5;
    
    // BOOSTED SPEEDS & ACCELERATION (as requested)
    const baseTop = isOff ? 80 : 360; 
    const accelRate = 240; 
    const damageMult = 1.0 - (this.damage * 0.4);
    const effectiveTop = baseTop * damageMult * (this.drsActive ? 1.12 : 1.0);
    const effAccel = accelRate * (isOff ? 0.25 : 1.0) * (0.4 + this.tireWear * 0.6);
    
    if (keys.w) {
      if (this.speed < effectiveTop) this.speed += effAccel * dt;
      else this.speed *= Math.pow(0.995, dt * 60);
    } else if (keys.s) {
      this.speed = Math.max(-60, this.speed - 350 * dt);
    } else {
      this.speed *= Math.pow(0.985, dt * 60);
    }

    // STEERING responsiveness (boosted)
    const sf = Math.min(1, Math.abs(this.speed)/80);
    const dir = this.speed < 0 ? -1 : 1;
    const steerLimit = 2.8; 
    if (keys.a) this.angle += steerLimit * sf * dir * dt;
    if (keys.d) this.angle -= steerLimit * sf * dir * dt;

    // Movement
    const px = this.x, pz = this.z;
    this.x += Math.sin(this.angle) * this.speed * dt;
    this.z += Math.cos(this.angle) * this.speed * dt;

    // Collisions
    if (trackDist > TRACK_WIDTH + 8 && Math.abs(this.speed) > 50) {
      this.speed *= 0.5; this.damage = Math.min(1, this.damage + 0.15); 
      this.x = px; this.z = pz;
    }
    if (isOff && Math.abs(this.speed) > 120) this.damage = Math.min(1, this.damage + 0.03 * dt);

    this.mesh.position.set(this.x, 0.28, this.z);
    this.mesh.rotation.y = this.angle;
    this.wheels.forEach(w => w.rotation.x += this.speed*dt*0.8);
    this.tireWear = Math.max(0, this.tireWear - 0.000003 * Math.abs(this.speed));
    
    // Automatic Gear
    this.gear = this.speed < 40 ? 1 : this.speed < 90 ? 2 : this.speed < 150 ? 3 : this.speed < 210 ? 4 : this.speed < 270 ? 5 : this.speed < 320 ? 6 : this.speed < 350 ? 7 : 8;
  }

  getTrackDist() {
    if (!window._curve) return 0;
    let minD = Infinity;
    for(let i=0; i<=60; i++) {
      const p = window._curve.getPointAt(i/60);
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
    this.racing = false; this.lapStart = 0; this.allCars = [];
    this.keys = { w:0,a:0,s:0,d:0,space:0 }; this.lap = 1; this._near = false; this._started = false;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.0005);
    
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(200,400,100); this.scene.add(sun);

    this.camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 1, 10000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(innerWidth, innerHeight);
    document.body.appendChild(this.renderer.domElement);

    const raw = CIRCUITS[circuitName];
    const pts = raw.map(p => new THREE.Vector3(p[0]*SCALE, 0, p[1]*SCALE));
    this.curve = new THREE.CatmullRomCurve3(pts, true);
    window._curve = this.curve;
    
    // Build Track Ribbon
    const splineCount = circuitName === 'SPA_BELGIUM' ? 1200 : 600;
    const spline = this.curve.getSpacedPoints(splineCount);
    const verts = [], idx = [];
    for(let i=0; i<=splineCount; i++) {
        const p = spline[i%splineCount], t = this.curve.getTangentAt((i%splineCount)/splineCount).normalize();
        const b = new THREE.Vector3().crossVectors(t, new THREE.Vector3(0,1,0)).normalize();
        const L = p.clone().addScaledVector(b, TRACK_WIDTH), R = p.clone().addScaledVector(b, -TRACK_WIDTH);
        verts.push(L.x, 0.1, L.z, R.x, 0.1, R.z);
        if (i < splineCount) { const j=i*2; idx.push(j,j+1,j+2, j+1,j+3,j+2); }
    }
    const trackGeo = new THREE.BufferGeometry();
    trackGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    trackGeo.setIndex(idx);
    this.scene.add(new THREE.Mesh(trackGeo, new THREE.MeshStandardMaterial({ color: 0x1a1a1a })));
    
    // Extra Ground
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(30000,30000), new THREE.MeshStandardMaterial({ color: 0x3a5a2a }));
    ground.rotation.x = -Math.PI/2; ground.position.y = 0; this.scene.add(ground);

    this.player = new CarPhysics(team, true);
    const p0 = spline[0], t0 = this.curve.getTangentAt(0);
    this.player.x = p0.x; this.player.z = p0.z; this.player.angle = Math.atan2(t0.x, t0.z);
    this.scene.add(this.player.mesh); this.allCars.push(this.player);

    const AI_TEAMS = TEAMS.filter(t => t.name !== team.name).slice(0, 7);
    AI_TEAMS.forEach((t, i) => {
      const car = new CarPhysics(t, false);
      const side = (i%2===0)?1:-1, row = Math.floor(i/2)+1;
      const b = new THREE.Vector3().crossVectors(t0, new THREE.Vector3(0,1,0)).normalize();
      car.x = p0.x + b.x*side*8 - t0.x*row*18; car.z = p0.z + b.z*side*8 - t0.z*row*18; car.angle = this.player.angle;
      this.scene.add(car.mesh); this.allCars.push(car);
    });

    this.setupControls();
    this._lastTime = performance.now();
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
    const dt = Math.min((now - this._lastTime)/1000, 0.05);
    this._lastTime = now;
    
    if (this.racing) {
      this.player.drsActive = this.keys.space && this.player.canUseDrs;
      this.player.update(dt, this.keys);
      this.allCars.forEach((c,i) => { if(i>0) this.updateAI(c, dt); });
      this.checkLap();
    }
    this.updateHUD(); this.updateCamera();
    this.renderer.render(this.scene, this.camera);
  }

  updateAI(car, dt) {
    let bestU = car.progress || 0;
    for(let i=0; i<15; i++) {
      const u = (bestU + 0.01 + Math.random()*0.02 + 1)%1; 
      const p = this.curve.getPointAt(u);
      const d = (p.x-car.x)**2 + (p.z-car.z)**2;
      if(d < 1000) { bestU = u; break; }
    }
    car.progress = bestU;
    const target = this.curve.getPointAt((bestU + 0.035)%1);
    const ang = Math.atan2(target.x-car.x, target.z-car.z);
    let diff = ang - car.angle;
    while(diff < -Math.PI) diff += Math.PI*2; while(diff > Math.PI) diff -= Math.PI*2;
    car.angle += diff * 4 * dt;
    car.x += Math.sin(car.angle)*car.speed*dt; car.z += Math.cos(car.angle)*car.speed*dt;
    car.speed = Math.min(330, car.speed + 200*dt);
    car.mesh.position.set(car.x, 0.28, car.z); car.mesh.rotation.y = car.angle;
  }

  checkLap() {
    const p = this.player, start = this.curve.getPointAt(0);
    const d = Math.sqrt((p.x-start.x)**2 + (p.z-start.z)**2);
    const near = d < 80;
    if (near && !this._near) {
       this._near = true;
       if (this._started) {
         p.lap++; if(p.lap > LAPS_TO_WIN) location.reload();
         const msg = document.getElementById('lap-msg'); msg.innerText=`LAP ${p.lap}`; msg.style.opacity=1;
         setTimeout(()=>msg.style.opacity=0, 2000);
       } else this._started = true;
       this.lapStart = performance.now();
    } else if(!near) this._near = false;
    
    let best = p.progress || 0;
    for(let i=0; i<30; i++){
      const u = (best - 0.02 + (i/30)*0.04 + 1)%1; 
      const cp = this.curve.getPointAt(u);
      const dist = (cp.x-p.x)**2 + (cp.z-p.z)**2;
      if(dist < 500) { best = u; break; }
    }
    p.progress = best;
    p.canUseDrs = (best > 0.05 && best < 0.25) || (best > 0.55 && best < 0.75);
  }

  updateHUD() {
    const p = this.player;
    document.getElementById('speed').innerText = Math.floor(p.speed);
    document.getElementById('gear').innerText = p.gear;
    document.getElementById('rpm-bar').style.width = Math.min(100, (p.speed % 60)*1.8) + '%';
    document.getElementById('drs-msg').innerText = p.drsActive ? 'DRS ACTIVE' : p.canUseDrs ? 'DRS AVAILABLE' : 'DRS LOCKED';
    document.getElementById('drs-msg').style.color = p.drsActive ? '#0f0' : p.canUseDrs ? '#ff0' : '#555';
    
    const elapsed = this._started ? (performance.now() - this.lapStart)/1000 : 0;
    const mm = Math.floor(elapsed/60).toString().padStart(2,'0'), ss = Math.floor(elapsed%60).toString().padStart(2,'0'), ms = Math.floor((elapsed%1)*1000).toString().padStart(3,'0');
    document.getElementById('hud-timer').innerText = `${mm}:${ss}.${ms}`;
    document.getElementById('lap').innerText = `${p.lap}/5`;
    document.getElementById('dmg').innerText = `${Math.floor(p.damage*100)}%`;
    
    for(let i=0;i<4;i++) document.getElementById(`t${i}`).style.background = `rgb(${Math.floor((1-p.tireWear)*255)},${Math.floor(p.tireWear*255)},0)`;
    
    const sorted = [...this.allCars].sort((a,b) => b.lap - a.lap || b.progress - a.progress);
    const pos = sorted.indexOf(p) + 1;
    document.getElementById('pos').innerText = `POS: ${pos}${pos===1?'st':pos===2?'nd':pos===3?'rd':'th'}`;
    document.getElementById('lb-rows').innerHTML = sorted.map((c,i) => `<div style="display:flex; justify-content:space-between; color:${c===this.player?'#fff':'#888'}"><span>P${i+1} ${c.team.short}</span><span>${i===0?'LEADER':'+'+((sorted[0].progress-c.progress)*25).toFixed(1)+'s'}</span></div>`).join('');
  }

  updateCamera() {
    const p = this.player;
    const cx = p.x - Math.sin(p.angle)*30, cz = p.z - Math.cos(p.angle)*30;
    this.camera.position.lerp(new THREE.Vector3(cx, 12, cz), 0.15);
    this.camera.lookAt(p.x, 3, p.z);
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
    const d = document.createElement('div'); d.className='card'; d.innerHTML=`<div class="card-short" style="font-size:0.8rem">${c.replace('_',' ')}</div><div class="card-name">GP Circuit</div>`;
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
