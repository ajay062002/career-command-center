import * as THREE from 'three';

// ─────────────────────────────────────────────
// 1. CONSTANTS & TEAMS
// ─────────────────────────────────────────────
const TEAMS = [
  { name: 'Scuderia Ferrari',  short: 'FER', color: '#e10600', cockpit: '#ff4400' },
  { name: 'Oracle Red Bull',   short: 'RBR', color: '#3671c6', cockpit: '#ffd700' },
  { name: 'Mercedes AMG',      short: 'MER', color: '#00d2be', cockpit: '#000000' },
  { name: 'McLaren F1',        short: 'MCL', color: '#ff8700', cockpit: '#000000' },
  { name: 'Aston Martin',      short: 'AMR', color: '#358c4e', cockpit: '#ffd700' },
  { name: 'Alpine F1',         short: 'ALP', color: '#0078ff', cockpit: '#ff0090' },
];

const CIRCUITS = {
  MONACO: [
    [  0,  0], [120,  0], [240, 60], [300,180], [280,320],
    [200,440], [ 80,500], [-80,480], [-200,380], [-260,220],
    [-220, 80], [-100, 10]
  ],
  SILVERSTONE: [
    [  0,  0], [160, 20], [320, 80], [420,200], [400,360],
    [280,460], [120,480], [-60,420], [-180,300], [-200,140],
    [-100, 40]
  ],
  MONZA: [
    [  0,  0], [300,  0], [460, 80], [480,220], [400,360],
    [200,420], [  0,400], [-160,320], [-200,160], [-100, 40]
  ],
};

const LAPS_TO_WIN = 5;
const TRACK_WIDTH = 22;    // half-width in world units (scale)
const SCALE = 2.5;         // waypoint scale multiplier — bigger circuits

// ─────────────────────────────────────────────
// 2. BUILD TRACK
// ─────────────────────────────────────────────
function buildTrack(scene, rawPts) {
  const pts3 = rawPts.map(([x, z]) => new THREE.Vector3(x * SCALE, 0, z * SCALE));
  const curve = new THREE.CatmullRomCurve3(pts3, true);
  const N = 600;
  const splinePts = curve.getSpacedPoints(N);

  // Ribbon geometry
  const verts = [], uvs = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const p = splinePts[i % N];
    const t = curve.getTangentAt((i % N) / N).normalize();
    const b = new THREE.Vector3().crossVectors(t, new THREE.Vector3(0,1,0)).normalize();
    const L = p.clone().addScaledVector(b,  TRACK_WIDTH);
    const R = p.clone().addScaledVector(b, -TRACK_WIDTH);
    verts.push(L.x, 0.05, L.z, R.x, 0.05, R.z);
    uvs.push(0, i / N * 8, 1, i / N * 8);
    if (i < N) {
      const a = i*2, b2 = i*2+1, c = (i+1)*2, d = (i+1)*2+1;
      idx.push(a,b2,c, b2,d,c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();

  // Asphalt texture
  const ac = document.createElement('canvas'); ac.width = ac.height = 256;
  const ax = ac.getContext('2d');
  ax.fillStyle = '#1a1a1a'; ax.fillRect(0,0,256,256);
  ax.strokeStyle = '#252525'; ax.lineWidth = 8;
  for (let i=0; i<256; i+=32) {
    ax.beginPath(); ax.moveTo(i,0); ax.lineTo(i,256); ax.stroke();
    ax.beginPath(); ax.moveTo(0,i); ax.lineTo(256,i); ax.stroke();
  }
  const atex = new THREE.CanvasTexture(ac);
  atex.wrapS = atex.wrapT = THREE.RepeatWrapping; atex.repeat.set(6, 80);
  const mat = new THREE.MeshStandardMaterial({ map: atex, roughness: 0.9 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  scene.add(mesh);

  // Ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(20000, 20000),
    new THREE.MeshStandardMaterial({ color: 0x3a5a2a, roughness: 1 })
  );
  ground.rotation.x = -Math.PI/2; ground.position.y = -0.02; ground.receiveShadow = true;
  scene.add(ground);

  // White center dashed line
  const dashGeo = new THREE.PlaneGeometry(0.5, 5);
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.45, transparent: true });
  for (let i = 0; i < N; i += 24) {
    const p = splinePts[i];
    const t = curve.getTangentAt(i/N).normalize();
    const angle = Math.atan2(t.x, t.z);
    const dash = new THREE.Mesh(dashGeo, dashMat);
    dash.rotation.x = -Math.PI/2; dash.rotation.z = -angle;
    dash.position.set(p.x, 0.08, p.z);
    scene.add(dash);
  }

  // Curbs — shared geometry, two materials only
  const curbEvery = 10;
  const cgShared = new THREE.BoxGeometry(1.5, 0.25, 7);
  const cmWhite  = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const cmRed    = new THREE.MeshStandardMaterial({ color: 0xe10600 });
  for (let i = 0; i < N; i += curbEvery) {
    const p = splinePts[i];
    const t = curve.getTangentAt(i/N).normalize();
    const bv = new THREE.Vector3().crossVectors(t, new THREE.Vector3(0,1,0)).normalize();
    const angle = Math.atan2(t.x, t.z);
    const cm = Math.floor(i / curbEvery) % 2 === 0 ? cmWhite : cmRed;
    [-1,1].forEach(side => {
      const c = new THREE.Mesh(cgShared, cm);
      c.position.copy(p).addScaledVector(bv, side * (TRACK_WIDTH + 1));
      c.position.y = 0.12; c.rotation.y = angle;
      scene.add(c);
    });
  }

  // Armco barriers — reduced density, shared geometry & materials
  const armcoMat  = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.55, roughness: 0.3 });
  const armcoRed  = new THREE.MeshStandardMaterial({ color: 0xe10600, metalness: 0.3, roughness: 0.5 });
  const armcoGeo  = new THREE.BoxGeometry(1.0, 1.0, 7);
  const postGeo   = new THREE.CylinderGeometry(0.12, 0.12, 1.2, 6);
  const postMat   = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.6 });
  const barrierStep = 20; // one barrier per 20 segments per side ≈ 60 total — manageable
  for (let i = 0; i < N; i += barrierStep) {
    const p = splinePts[i];
    const t = curve.getTangentAt(i/N).normalize();
    const bv = new THREE.Vector3().crossVectors(t, new THREE.Vector3(0,1,0)).normalize();
    const angle = Math.atan2(t.x, t.z);
    const useRed = Math.floor(i / barrierStep) % 5 === 0;
    [-1, 1].forEach(side => {
      const barrier = new THREE.Mesh(armcoGeo, useRed ? armcoRed : armcoMat);
      barrier.position.copy(p).addScaledVector(bv, side * (TRACK_WIDTH + 3.2));
      barrier.position.y = 0.5; barrier.rotation.y = angle;
      scene.add(barrier);
      // post every 2nd barrier
      if (i % (barrierStep * 2) === 0) {
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.copy(p).addScaledVector(bv, side * (TRACK_WIDTH + 3.2));
        post.position.y = 0.6; scene.add(post);
      }
    });
  }

  // Finish line
  const flc = document.createElement('canvas'); flc.width = 256; flc.height = 32;
  const fx = flc.getContext('2d');
  for (let i = 0; i < 16; i++) {
    fx.fillStyle = i % 2 === 0 ? '#fff' : '#000';
    fx.fillRect(i*16, 0, 16, 16);
    fx.fillStyle = i % 2 === 0 ? '#000' : '#fff';
    fx.fillRect(i*16, 16, 16, 16);
  }
  const flt = new THREE.CanvasTexture(flc);
  const fl = new THREE.Mesh(
    new THREE.PlaneGeometry(TRACK_WIDTH*2, 5),
    new THREE.MeshBasicMaterial({ map: flt })
  );
  fl.rotation.x = -Math.PI/2; fl.position.y = 0.12;
  fl.position.set(splinePts[0].x, 0.12, splinePts[0].z);
  const t0 = curve.getTangentAt(0);
  fl.rotation.y = Math.atan2(t0.x, t0.z);
  scene.add(fl);

  // Pit lane box (visual marker near start/finish on one side)
  const pitLane = new THREE.Mesh(
    new THREE.PlaneGeometry(TRACK_WIDTH * 0.55, 30),
    new THREE.MeshBasicMaterial({ color: 0xffd700, opacity: 0.18, transparent: true })
  );
  const pitBv = new THREE.Vector3().crossVectors(curve.getTangentAt(0).normalize(), new THREE.Vector3(0,1,0)).normalize();
  pitLane.rotation.x = -Math.PI/2;
  pitLane.position.set(splinePts[0].x + pitBv.x * (TRACK_WIDTH * 0.65), 0.09, splinePts[0].z + pitBv.z * (TRACK_WIDTH * 0.65));
  pitLane.rotation.z = -Math.atan2(curve.getTangentAt(0).x, curve.getTangentAt(0).z);
  scene.add(pitLane);
  // Pit entry sign
  const pitSign = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 3, 4),
    new THREE.MeshStandardMaterial({ color: 0xffd700 })
  );
  pitSign.position.set(splinePts[0].x + pitBv.x * TRACK_WIDTH, 1.5, splinePts[0].z + pitBv.z * TRACK_WIDTH);
  scene.add(pitSign);

  // Grandstands
  const gsGeo = new THREE.BoxGeometry(12, 10, 28);
  const standColors = [0x1a3a6a, 0x6a1a1a, 0x1a5a1a, 0x4a3a1a];
  const crowdColors = [0xcc3333, 0x3366cc, 0x22aa44, 0xffaa00];
  for (let i = 0; i < N; i += 60) {
    const p = splinePts[i];
    const t = curve.getTangentAt(i/N).normalize();
    const bv = new THREE.Vector3().crossVectors(t, new THREE.Vector3(0,1,0)).normalize();
    const si = Math.floor(i / 60) % standColors.length;
    const gs = new THREE.Mesh(gsGeo, new THREE.MeshStandardMaterial({ color: standColors[si] }));
    gs.position.copy(p).addScaledVector(bv, TRACK_WIDTH + 12);
    gs.position.y = 5; gs.rotation.y = Math.atan2(t.x, t.z);
    gs.castShadow = true; scene.add(gs);
    // Crowd seating
    const crowd = new THREE.Mesh(
      new THREE.PlaneGeometry(26, 9),
      new THREE.MeshBasicMaterial({ color: crowdColors[si], side: THREE.DoubleSide })
    );
    crowd.position.copy(gs.position); crowd.position.y = 11;
    crowd.rotation.y = gs.rotation.y; scene.add(crowd);
    // Advertising boards at track edge
    const adColors = [0xe10600, 0xffd700, 0x0066cc, 0x00aa44];
    const ad = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 1.8, 14),
      new THREE.MeshStandardMaterial({ color: adColors[si] })
    );
    ad.position.copy(p).addScaledVector(bv, TRACK_WIDTH + 4.5);
    ad.position.y = 0.9; ad.rotation.y = Math.atan2(t.x, t.z);
    scene.add(ad);
  }

  return { curve, splinePts };
}

// ─────────────────────────────────────────────
// 3. BUILD LEGO CAR MESH
// ─────────────────────────────────────────────
function buildCarMesh(team) {
  const group = new THREE.Group();
  const c = parseInt(team.color.replace('#',''), 16);
  const ck = parseInt(team.cockpit.replace('#',''), 16);
  const mat  = (col) => new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, metalness: 0.3 });

  // Chassis
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2, 0.4, 5), mat(c));
  chassis.position.y = 0.5; chassis.castShadow = true; group.add(chassis);

  // Nose
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 2), mat(c));
  nose.position.set(0, 0.4, 3.4); group.add(nose);

  // Sidepods
  [-1,1].forEach(s => {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 2.5), mat(c));
    pod.position.set(s*1.1, 0.45, 0.5); group.add(pod);
  });

  // Cockpit
  const cock = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 1.2), mat(ck));
  cock.position.set(0, 0.85, 0); group.add(cock);

  // Front wing
  const fw = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 0.6), mat(c));
  fw.position.set(0, 0.22, 3.6); group.add(fw);
  const fwEnd1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.6), mat(c));
  fwEnd1.position.set(-1.6, 0.36, 3.6); group.add(fwEnd1);
  const fwEnd2 = fwEnd1.clone(); fwEnd2.position.set(1.6, 0.36, 3.6); group.add(fwEnd2);

  // Rear wing
  const rw = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.12, 0.5), mat(c));
  rw.position.set(0, 1.2, -2.4); group.add(rw);
  const rwPylon = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.8, 0.3), mat(c));
  rwPylon.position.set(0, 0.8, -2.4); group.add(rwPylon);

  // Wheels (4)
  const wGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.5, 14);
  const wMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  const wheelPositions = [
    [-1.35, 0.25,  1.8],
    [ 1.35, 0.25,  1.8],
    [-1.35, 0.25, -1.8],
    [ 1.35, 0.25, -1.8],
  ];
  const wheels = wheelPositions.map(([x,y,z]) => {
    const w = new THREE.Mesh(wGeo, wMat);
    w.rotation.z = Math.PI/2; w.position.set(x,y,z);
    w.castShadow = true; group.add(w);
    return w;
  });

  // Halo
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.07, 8, 20, Math.PI), mat(ck));
  halo.position.set(0, 1, 0.1); group.add(halo);

  // Driver helmet
  const helmetMat = new THREE.MeshStandardMaterial({ color: ck, roughness: 0.3, metalness: 0.1 });
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 14), helmetMat);
  helmet.position.set(0, 1.12, 0.05); helmet.scale.set(1, 1.1, 1.1); group.add(helmet);
  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 12, 8, 0, Math.PI*2, 0, Math.PI*0.55),
    new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.0, metalness: 0.95, opacity: 0.85, transparent: true })
  );
  visor.position.set(0, 1.08, 0.22); visor.rotation.x = 0.5; group.add(visor);

  // Wheel rims (silver inner disc)
  wheelPositions.forEach(([x,y,z]) => {
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.52, 10),
      new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.85, roughness: 0.15 })
    );
    rim.rotation.z = Math.PI/2; rim.position.set(x, y, z); group.add(rim);
  });

  // Mirrors
  [-1, 1].forEach(s => {
    const mirror = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.22, 0.38),
      mat(c)
    );
    mirror.position.set(s * 1.05, 0.98, 0.85); group.add(mirror);
  });

  // Exhaust pipes
  [-0.28, 0.28].forEach(offset => {
    const exhaust = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.1, 0.7, 8),
      new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.9, roughness: 0.1 })
    );
    exhaust.rotation.x = Math.PI/2; exhaust.position.set(offset, 0.62, -2.75); group.add(exhaust);
  });

  // Floor/undertray (flat black plate)
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.08, 4.8),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 })
  );
  floor.position.set(0, 0.28, -0.1); group.add(floor);

  return { group, wheels };
}

// ─────────────────────────────────────────────
// 4. CAR PHYSICS (pure arcade, no cannon-es)
// ─────────────────────────────────────────────
class CarPhysics {
  constructor(team, isPlayer) {
    this.team = team;
    this.isPlayer = isPlayer;
    const { group, wheels } = buildCarMesh(team);
    this.mesh = group;
    this.wheels = wheels;

    // State
    this.x = 0; this.z = 0; this.angle = 0;
    this.speed = 0;
    this.gear = 1;
    this.tireWear = 1.0;
    this.lap = 1;
    this.progress = 0;   // 0..1 along spline

    // Tuning
    this.accel    = isPlayer ? 140 : 110 + Math.random()*30;
    this.brakeF   = 280;
    this.topSpeed = isPlayer ? 280 : 200 + Math.random()*60;
    this.drag     = 0.985;
    this.turnRate = 2.2;
    this.drsActive = false;
    this.compound = 'MEDIUM'; // SOFT, MEDIUM, HARD
    this.damage = 0;
  }

  setPos(x, z, angle) { this.x=x; this.z=z; this.angle=angle; this.syncMesh(); }

  update(dt, keys) {
    if (!keys) return;
    // Grass Slowdown & DRS Zone check
    const trackDist = this.getTrackDist();
    const isOffTrack = trackDist > TRACK_WIDTH + 4; // 4-unit grace buffer beyond true edge
    const currentU = this.progress || 0;
    const inDrsZone = (currentU > 0.05 && currentU < 0.25) || (currentU > 0.55 && currentU < 0.75);

    // Physics
    const gearMult = 0.8 + (this.gear / 8) * 0.4;
    const offTrackMult = isOffTrack ? 0.3 : 1.0;
    const compoundMult = this.compound === 'SOFT' ? 1.05 : this.compound === 'HARD' ? 0.95 : 1.0;
    const compoundWear = this.compound === 'SOFT' ? 1.5 : this.compound === 'HARD' ? 0.6 : 1.0;
    const damageMult = 1.0 - (this.damage * 0.45);
    const rainGrip = window._isRainy ? 0.65 : 1.0;
    const eff = (0.3 + this.tireWear * 0.4) * rainGrip;
    const effectiveAccel = this.accel * gearMult * eff * offTrackMult * compoundMult * damageMult;
    const effectiveTopSpeed = (isOffTrack ? 60 : this.topSpeed * compoundMult * damageMult) * (this.drsActive ? 1.15 : 1.0);

    // Throttle / Brake
    if (keys.w) {
      this.speed = Math.min(effectiveTopSpeed, this.speed + effectiveAccel * dt);
    } else if (keys.s) {
      this.speed = Math.max(isOffTrack ? -20 : -40, this.speed - this.brakeF * dt);
    } else {
      this.speed *= Math.pow(this.drag, dt * 60);
    }

    // DRS Logic
    this.canUseDrs = !isOffTrack && inDrsZone && this.speed > 100;
    if (this.drsActive && !this.canUseDrs) this.drsActive = false;
    
    if (this.drsActive) {
      this.speed = Math.min(effectiveTopSpeed, this.speed + 80 * dt);
    }

    // Steer
    const sf = Math.min(1, Math.abs(this.speed) / (isOffTrack ? 30 : 60)); 
    const dir = this.speed < 0 ? -1 : 1;
    const steerLimit = isOffTrack ? 1.2 : 2.2;
    if (keys.a) this.angle += steerLimit * sf * dir * dt;
    if (keys.d) this.angle -= steerLimit * sf * dir * dt;

    // Move
    const prevX = this.x, prevZ = this.z;
    this.x += Math.sin(this.angle) * this.speed * dt;
    this.z += Math.cos(this.angle) * this.speed * dt;

    // Fast barrier collision
    if (trackDist > TRACK_WIDTH + 4.5 && Math.abs(this.speed) > 40) {
      this.speed *= 0.35;
      this.damage = Math.min(1.0, this.damage + 0.12);
      if (window._gameAudio && this.isPlayer) window._gameAudio.playCrash();
      this.x = prevX; this.z = prevZ;
    }

    // Gear
    const spd = Math.abs(this.speed);
    this.gear = spd < 40 ? 1 : spd < 90 ? 2 : spd < 140 ? 3 : spd < 180 ? 4 : spd < 220 ? 5 : spd < 260 ? 6 : 7;

    // Tire wear (affected by compound)
    this.tireWear = Math.max(0, this.tireWear - 0.00005 * spd * dt * compoundWear);

    this.syncMesh();
    // Spin wheels
    const rot = this.speed * dt * 0.7;
    this.wheels.forEach(w => w.rotation.x += rot);
  }

  syncMesh() {
    this.mesh.position.set(this.x, 0.28, this.z);
    this.mesh.rotation.y = this.angle;
  }

  resetTires(compound) { 
    this.tireWear = 1.0; 
    this.damage = 0;
    if (compound) this.compound = compound;
  }

  getTrackDist() {
    if (!window._gameCurve) return 0;
    let minD = Infinity;
    // Fast search with local cache if needed, but 40 pts is fine
    for (let i = 0; i <= 100; i++) {
        const u = i / 100;
        const p = window._gameCurve.getPointAt(u);
        const d = (p.x - this.x)**2 + (p.z - this.z)**2;
        if (d < minD) minD = d;
    }
    return Math.sqrt(minD);
  }
}

// ─────────────────────────────────────────────
// 5. AI CONTROLLER
// ─────────────────────────────────────────────
class AIController {
  constructor(car, curve) {
    this.car = car;
    this.curve = curve;
    this.progress = 0;
    this.checkpointPassed = false;
    this.lap = 1;
    this.lookahead = 0.03 + Math.random() * 0.01;
    this.speedTarget = 170 + Math.random() * 60;
    this.lateralOffset = (Math.random() - 0.5) * 8; // Random lane [-4 to 4]
  }

  update(dt) {
    // Real-search for closest u
    let minD = Infinity, bestU = this.progress;
    for (let i = 0; i <= 20; i++) {
      const u = ((this.progress - 0.05) + (i/20)*0.1 + 1) % 1;
      const p = this.curve.getPointAt(u);
      const d = (p.x - this.car.x)**2 + (p.z - this.car.z)**2;
      if (d < minD) { minD = d; bestU = u; }
    }
    this.progress = bestU;
    this.car.progress = bestU;

    // Lap counting
    if (bestU > 0.5) this.checkpointPassed = true;
    if (bestU < 0.05 && this.checkpointPassed) {
      this.lap++; this.car.lap = this.lap; this.checkpointPassed = false;
    }

    // Steer toward lookahead + lateral offset
    const targetU = (bestU + this.lookahead) % 1;
    let tp = this.curve.getPointAt(targetU);
    // Add lateral offset for 'racing line' / overtaking
    const tangent = this.curve.getTangentAt(targetU).normalize();
    const bitangent = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0,1,0)).normalize();
    tp.addScaledVector(bitangent, this.lateralOffset);

    const desiredAngle = Math.atan2(tp.x - this.car.x, tp.z - this.car.z);
    let diff = desiredAngle - this.car.angle;
    while (diff < -Math.PI) diff += Math.PI*2;
    while (diff >  Math.PI) diff -= Math.PI*2;
    const steerStrength = Math.max(-1, Math.min(1, diff * 3));

    const keys = {
      w: this.car.speed < this.speedTarget,
      s: this.car.speed > this.speedTarget + 20,
      a: steerStrength > 0,
      d: steerStrength < 0,
    };
    this.car.turnRate = 2.8 * Math.abs(steerStrength);
    this.car.update(dt, keys);
    this.car.turnRate = 2.2; // reset
  }
}

// ─────────────────────────────────────────────
// 6. HUD
// ─────────────────────────────────────────────
function createHUD() {
  document.getElementById('hud').style.display = 'block';
  const mapCtx = document.getElementById('minimap-canvas').getContext('2d');
  let mapPts = null, mapMinX, mapMaxX, mapMinZ, mapMaxZ;

  return {
    update(player, allCars, curve, now, lapStart) {
      const spd = Math.floor(Math.abs(player.speed));
      document.getElementById('hud-speed').innerText = spd.toString().padStart(3,'0');
      document.getElementById('hud-gear').innerText = player.gear || 'N';
      document.getElementById('rpm-bar').style.width = Math.min(100, (spd % 100)) + '%';

      // DRS
      const drsEl = document.getElementById('drs-light');
      if (player.drsActive) {
          drsEl.className = 'active';
          drsEl.innerText = 'DRS: ACTIVE';
          drsEl.style.color = '#00ff88';
      } else if (player.canUseDrs) {
          drsEl.className = 'available';
          drsEl.innerText = 'DRS: AVAILABLE';
          drsEl.style.color = '#ffff00';
          drsEl.style.animation = 'blink 0.5s infinite';
      } else {
          drsEl.className = '';
          drsEl.innerText = 'DRS: LOCKED';
          drsEl.style.color = '#444';
          drsEl.style.animation = 'none';
      }

      // Timer
      const elapsed = (now - lapStart) / 1000;
      const fmt = (s) => {
        const mm = Math.floor(s/60).toString().padStart(2,'0');
        const ss = Math.floor(s%60).toString().padStart(2,'0');
        const ms = Math.floor((s%1)*1000).toString().padStart(3,'0');
        return `${mm}:${ss}.${ms}`;
      };
      document.getElementById('hud-timer').innerText = fmt(elapsed);

      // Best Lap
      if (player.bestLapTime && player.bestLapTime !== Infinity) {
        document.getElementById('hud-best').innerText = fmt(player.bestLapTime);
      }

      // Sectors
      if (player.sectorTimes) {
        player.sectorTimes.forEach((t, i) => {
          const el = document.getElementById(`s${i+1}-time`);
          if (t > 0) el.innerText = t.toFixed(1);
          // Highlight colors could go here
        });
      }

      // Lap
      document.getElementById('hud-lap').innerText = `${player.lap + 1} / ${LAPS_TO_WIN}`;

      // Position + Leaderboard
      const sorted = [...allCars].sort((a,b) => (b.lap||1)-(a.lap||1) || (b.progress||0)-(a.progress||0));
      const pos = sorted.findIndex(c => c === player) + 1;
      const suffixes = ['st','nd','rd'];
      const suf = suffixes[pos-1] || 'th';
      document.getElementById('hud-pos').innerText = `POS: ${pos}${suf}`;

      // Leaderboard panel
      const lbEl = document.getElementById('lb-rows');
      if (lbEl) {
        lbEl.innerHTML = sorted.map((car, i) => {
          const isMe = car === player;
          const gap = i === 0 ? 'LEADER' : `+${((sorted[0].progress - car.progress + (sorted[0].lap - car.lap)) * 12).toFixed(1)}s`;
          return `<div class="lb-row${isMe ? ' is-player' : ''}">
            <span class="lb-pos">P${i+1}</span>
            <span class="lb-name" style="color:${isMe ? '#fff' : car.team.color}">${car.team.short}</span>
            <span class="lb-gap">${gap}</span>
          </div>`;
        }).join('');
      }

      // Pit notice
      document.getElementById('pit-notice').style.display =
        (player.lap >= 2 && player.lap <= LAPS_TO_WIN - 1 && player.tireWear < 0.6) ? 'block' : 'none';

      // Tires
      for (let i=0;i<4;i++) {
        const w = player.tireWear;
        const r = Math.floor((1-w)*255), g = Math.floor(w*255);
        document.getElementById(`t${i}`).style.background = `rgb(${r},${g},0)`;
      }
      document.getElementById('tire-pct').innerText = `${this.player.compound} | ${Math.floor(player.tireWear*100)}%`;
      const dmgEl = document.getElementById('dmg-val');
      if (dmgEl) {
          dmgEl.innerText = `${Math.floor(player.damage * 100)}%`;
          dmgEl.style.color = player.damage > 0.5 ? '#f00' : player.damage > 0.1 ? '#ff0' : '#888';
      }

      // Minimap
      if (!mapPts) {
        mapPts = curve.getSpacedPoints(200);
        const xs = mapPts.map(p=>p.x), zs = mapPts.map(p=>p.z);
        mapMinX=Math.min(...xs); mapMaxX=Math.max(...xs);
        mapMinZ=Math.min(...zs); mapMaxZ=Math.max(...zs);
      }
      const range = Math.max(mapMaxX-mapMinX, mapMaxZ-mapMinZ)||1;
      const sc = 150/range;
      const tx = x => (x-mapMinX)*sc+15;
      const tz = z => (z-mapMinZ)*sc+15;
      const ctx = mapCtx;
      ctx.clearRect(0,0,180,180);
      ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=2;
      ctx.beginPath();
      mapPts.forEach((p,i)=> i===0 ? ctx.moveTo(tx(p.x),tz(p.z)) : ctx.lineTo(tx(p.x),tz(p.z)));
      ctx.closePath(); ctx.stroke();
      allCars.forEach(car => {
        ctx.fillStyle = car === player ? '#ffffff' : car.team.color;
        ctx.beginPath(); ctx.arc(tx(car.x), tz(car.z), car===player?5:3, 0, Math.PI*2);
        ctx.fill();
      });
    },
    flashLap(lapNum) {
      const el = document.getElementById('lap-flash');
      el.innerText = `LAP ${lapNum}`; el.style.opacity = 1;
      setTimeout(() => el.style.opacity=0, 2000);
    }
  };
}

// ─────────────────────────────────────────────
// 7. AUDIO
// ─────────────────────────────────────────────
function createAudio() {
  let ctx, engineOsc, engineGain, masterGain;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain(); masterGain.connect(ctx.destination);
    
    // Engine
    engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth';
    engineGain = ctx.createGain(); engineGain.gain.value = 0;
    engineOsc.connect(engineGain); engineGain.connect(masterGain); 
    engineOsc.start();
  } catch(e) {}

  return {
    update(speed, gear, racing) {
      if (!engineOsc) return;
      if (!racing) { engineGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1); return; }
      engineGain.gain.setTargetAtTime(0.03, ctx.currentTime, 0.1);
      const pitch = 85 + (Math.abs(speed)/300)*750 + (gear*18);
      engineOsc.frequency.setTargetAtTime(pitch, ctx.currentTime, 0.08);
    },
    playCrash() {
      if (!ctx) return;
      const noise = ctx.createBufferSource();
      const bufferSize = ctx.sampleRate * 0.4;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 800;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.4, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      noise.connect(filter); filter.connect(g); g.connect(masterGain);
      noise.start();
    },
    playPit() {
      if (!ctx || !masterGain) return;
      const osc = ctx.createOscillator(); osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.05, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(g); g.connect(masterGain);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
    }
  };
}

// ─────────────────────────────────────────────
// 8. SELECTION SCREEN
// ─────────────────────────────────────────────
function showSelection(onStart) {
  const teamCards = document.getElementById('team-cards');
  const circuitCards = document.getElementById('circuit-cards');
  const circuitLabel = document.getElementById('circuit-label');
  const startBtn = document.getElementById('start-btn');

  let selTeam = null, selCircuit = null;

  // Build team cards
  TEAMS.forEach((t) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<div class="card-color" style="background:${t.color}"></div>
      <div class="card-short">${t.short}</div>
      <div class="card-name">${t.name}</div>`;
    card.onclick = () => {
      document.querySelectorAll('#team-cards .card').forEach(c=>c.classList.remove('selected'));
      card.classList.add('selected'); selTeam = t;
      circuitLabel.style.display = 'block';
      circuitCards.style.display = 'flex';
      updateStart();
    };
    teamCards.appendChild(card);
  });

  // Build circuit cards
  Object.keys(CIRCUITS).forEach(name => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<div class="card-short" style="font-size:0.9rem">${name}</div><div class="card-name" style="margin-top:8px">GP Circuit</div>`;
    circuitCards.appendChild(card);
    card.style.display = 'none'; // hidden until team selected
    card.onclick = () => {
      circuitCards.querySelectorAll('.card').forEach(c=>c.classList.remove('selected'));
      card.classList.add('selected'); selCircuit = name;
      updateStart();
    };
  });

  function updateStart() {
    // Show circuit cards
    circuitCards.querySelectorAll('.card').forEach(c=>c.style.display='block');
    startBtn.style.display = selTeam && selCircuit ? 'block' : 'none';
  }

  startBtn.onclick = () => {
    document.getElementById('overlay').style.display = 'none';
    onStart(selTeam, selCircuit);
  };
}

// ─────────────────────────────────────────────
// 9. COUNTDOWN
// ─────────────────────────────────────────────
function showCountdown(cb) {
  const el = document.getElementById('countdown-overlay');
  const units = document.querySelectorAll('.light-unit');
  el.style.display = 'flex';
  units.forEach(u => u.classList.remove('active'));
  
  let lights = 0;
  const iv = setInterval(() => {
    if (lights < 5) {
      units[lights].classList.add('active');
      lights++;
      // Optional: Add a 'beep' sound here if audio is ready
    } else {
      clearInterval(iv);
      // F1 lights stay red for a random short duration before going out
      const holdTime = 800 + Math.random() * 2000;
      setTimeout(() => {
        units.forEach(u => u.classList.remove('active'));
        // The signal is lights out!
        setTimeout(() => {
          el.style.display = 'none';
          cb(); 
        }, 300); 
      }, holdTime);
    }
  }, 1000);
}

// ─────────────────────────────────────────────
// 10. FINISH
// ─────────────────────────────────────────────
function showFinish(game) {
  const allCars = game.allCars;
  const sorted = [...allCars].sort((a,b) => (b.lap||1)-(a.lap||1)||(b.progress||0)-(a.progress||0));
  const list = document.getElementById('podium-list');
  const medals = ['🥇','🥈','🥉'];
  list.innerHTML = sorted.slice(0,3).map((c,i) =>
    `<div class="podium-entry">${medals[i]} ${c.team.name}</div>`
  ).join('');
  document.getElementById('finish-overlay').style.display = 'flex';
  
  // Start Replay
  setTimeout(() => {
    game.isReplaying = true;
    game.replayFrame = 0;
  }, 2000);
}

// ─────────────────────────────────────────────
// 11. GAME CLASS
// ─────────────────────────────────────────────
class Game {
  constructor(team, circuitName) {
    this.racing = false;
    this.finished = false;
    this.lapStart = 0;
    this.cameraMode = 0; // 0=chase, 1=TV
    this._nearLine = false;
    this._raceStarted = false;
    this.allCars = [];
    this.isRainy = Math.random() < 0.28;
    window._isRainy = this.isRainy;
    this.bestLapTime = Infinity;
    this.replayData = [];
    this.isReplaying = false;
    this.replayFrame = 0;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.0008);

    // Lighting
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    this.scene.add(new THREE.HemisphereLight(0x87ceeb, 0x3a5a2a, 0.6));
    const sun = new THREE.DirectionalLight(0xfffde7, 1.6);
    sun.position.set(300, 500, 150); sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 3000;
    sun.shadow.camera.left = -800; sun.shadow.camera.right = 800;
    sun.shadow.camera.top = 800; sun.shadow.camera.bottom = -800;
    this.scene.add(sun);
    // Subtle fill light from the opposite side
    const fill = new THREE.DirectionalLight(0xaaccff, 0.35);
    fill.position.set(-200, 150, -100);
    this.scene.add(fill);

    // Camera & Renderer
    this.camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.5, 3000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(devicePixelRatio);
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    document.body.appendChild(this.renderer.domElement);

    window.addEventListener('resize', () => {
      this.camera.aspect = innerWidth/innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });

    // Track
    const { curve, splinePts } = buildTrack(this.scene, CIRCUITS[circuitName]);
    this.curve = curve; this.splinePts = splinePts;
    window._gameCurve = curve; // Global access for distance check

    // Player car
    this.player = new CarPhysics(team, true);
    const p0 = splinePts[0], t0 = curve.getTangentAt(0);
    const ang0 = Math.atan2(t0.x, t0.z);
    this.player.setPos(p0.x, p0.z, ang0);
    this.player.lap = 0; // will go to 1 on first line cross
    this.player.bestLapTime = Infinity;
    this.player.sectorTimes = [0, 0, 0];
    this.player.lastSectorProgress = 0;
    this.scene.add(this.player.mesh);
    this.allCars.push(this.player);

    // AI cars
    const others = TEAMS.filter(t => t.name !== team.name).slice(0, 5);
    this.aiList = [];
    others.forEach((t, i) => {
      const row = Math.floor(i/2)+1, side = (i%2===0)?1:-1;
      const bv = new THREE.Vector3().crossVectors(t0, new THREE.Vector3(0,1,0)).normalize();
      const ai = new CarPhysics(t, false);
      ai.setPos(p0.x + bv.x*side*5 - t0.x*row*12, p0.z + bv.z*side*5 - t0.z*row*12, ang0);
      ai.lap = 0;
      this.scene.add(ai.mesh);
      this.allCars.push(ai);
      this.aiList.push(new AIController(ai, curve));
    });

    // HUD & Audio
    this.hud = createHUD();
    this.audio = createAudio();
    window._gameAudio = this.audio;

    // Controls
    this.keys = { w:false, a:false, s:false, d:false, space:false, p:false };
    document.addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp')    this.keys.w = true;
      if (k === 's' || e.key === 'ArrowDown')  this.keys.s = true;
      if (k === 'a' || e.key === 'ArrowLeft')  this.keys.a = true;
      if (k === 'd' || e.key === 'ArrowRight') this.keys.d = true;
      if (e.key === ' ') { this.keys.space = true; e.preventDefault(); }
      if (k === 'p') this.handlePit();
      if (k === 'c') this.cameraMode = 1 - this.cameraMode;
    });
    document.addEventListener('keyup', e => {
      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp')    this.keys.w = false;
      if (k === 's' || e.key === 'ArrowDown')  this.keys.s = false;
      if (k === 'a' || e.key === 'ArrowLeft')  this.keys.a = false;
      if (k === 'd' || e.key === 'ArrowRight') this.keys.d = false;
      if (e.key === ' ') this.keys.space = false;
    });

    this._lastTime = performance.now();
    this.setupTouch();
    if (this.isRainy) this.enableRain();
    // Pre-position camera behind player so first frame isn't black
    const initCx = p0.x - Math.sin(ang0) * 18;
    const initCz = p0.z - Math.cos(ang0) * 18;
    this.camera.position.set(initCx, 8, initCz);
    this.camera.lookAt(new THREE.Vector3(p0.x, 1.5, p0.z));
    this.animate();
  }

  enableRain() {
    this.scene.background = new THREE.Color(0x333344);
    this.scene.fog.color = new THREE.Color(0x333344);
    this.scene.fog.density = 0.0015;
    
    const geo = new THREE.BufferGeometry();
    const pos = [];
    for (let i = 0; i < 2500; i++) {
      pos.push((Math.random() - 0.5) * 400, Math.random() * 200, (Math.random() - 0.5) * 400);
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0x8888ff, size: 0.15, transparent: true, opacity: 0.4 });
    this.rain = new THREE.Points(geo, mat);
    this.scene.add(this.rain);
  }

  setupTouch() {
    const bind = (id, key) => {
      const el = document.getElementById(id);
      if (!el) return;
      const start = (e) => { this.keys[key] = true; if(e.cancelable) e.preventDefault(); };
      const end = (e) => { this.keys[key] = false; if(e.cancelable) e.preventDefault(); };
      el.addEventListener('touchstart', start, {passive:false});
      el.addEventListener('touchend', end, {passive:false});
      // Desktop testing support
      el.addEventListener('mousedown', start);
      el.addEventListener('mouseup', end);
      el.addEventListener('mouseleave', end);
    };
    bind('touch-left', 'a');
    bind('touch-right', 'd');
    bind('touch-gas', 'w');
    bind('touch-brake', 's');
    bind('touch-drs', 'space');
    
    const pitBtn = document.getElementById('touch-pit');
    if (pitBtn) {
      pitBtn.addEventListener('touchstart', (e) => {
        this.handlePit();
        if(e.cancelable) e.preventDefault();
      }, {passive:false});
      pitBtn.addEventListener('click', () => this.handlePit());
    }
  }

  startRacing() {
    this.racing = true;
    this.lapStart = performance.now();
  }

  handlePit() {
    if (!this.racing || this.finished || this._inPit) return;
    // Must be in pit zone: near start/finish (progress < 0.08 or > 0.92)
    const prog = this.player.progress || 0;
    const inPitZone = prog < 0.08 || prog > 0.92;
    if (!inPitZone) {
      // Show toast: not in pit zone
      let toast = document.getElementById('pit-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'pit-toast';
        toast.style = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.85);color:#e10600;font-family:Orbitron,sans-serif;font-size:1.1rem;font-weight:700;padding:18px 36px;border:2px solid #e10600;border-radius:6px;z-index:50;pointer-events:none;';
        document.body.appendChild(toast);
      }
      toast.innerText = 'PIT ENTRY: APPROACH START LINE';
      toast.style.opacity = '1';
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
      return;
    }
    if (Math.abs(this.player.speed) > 60) {
      let toast = document.getElementById('pit-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'pit-toast';
        toast.style = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.85);color:#ffd700;font-family:Orbitron,sans-serif;font-size:1.1rem;font-weight:700;padding:18px 36px;border:2px solid #ffd700;border-radius:6px;z-index:50;pointer-events:none;';
        document.body.appendChild(toast);
      }
      toast.innerText = 'SLOW DOWN FOR PIT ENTRY';
      toast.style.opacity = '1';
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 2000);
      return;
    }
    this._inPit = true;
    this.player.speed = 0;
    this.racing = false;
    if (this.audio) this.audio.playPit();
    const note = document.createElement('div');
    note.style = 'position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.82);z-index:50;font-family:Orbitron,sans-serif;color:#ffd700;gap:12px;';
    note.innerHTML = `
      <div style="font-size:2.8rem;font-weight:900;letter-spacing:0.1em;">PIT STOP</div>
      <div style="font-size:1rem;color:#aaa;">NEW TIRES — FUEL</div>
      <div id="pit-bar-bg" style="width:280px;height:8px;background:#333;border-radius:4px;margin-top:10px;">
        <div id="pit-bar" style="height:100%;width:0%;background:#e10600;border-radius:4px;transition:width 0.1s;"></div>
      </div>
      <div id="pit-countdown" style="font-size:1.4rem;color:#e10600;font-weight:700;">3.0s</div>
    `;
    document.body.appendChild(note);
    let elapsed = 0;
    const duration = 3000;
    const iv = setInterval(() => {
      elapsed += 100;
      const pct = Math.min(100, (elapsed / duration) * 100);
      document.getElementById('pit-bar').style.width = pct + '%';
      document.getElementById('pit-countdown').innerText = ((duration - elapsed) / 1000).toFixed(1) + 's';
      if (elapsed >= duration) {
        clearInterval(iv);
        // Show selection buttons
        const selection = document.createElement('div');
        selection.style = 'position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.9);z-index:60;font-family:Orbitron,sans-serif;color:#fff;gap:30px;';
        selection.innerHTML = `
          <div style="font-size:2rem;font-weight:900;">SELECT COMPOUND</div>
          <div style="display:flex;gap:20px;">
            <button class="pit-btn" id="s-tire" style="background:#e10600;color:#fff;padding:20px 40px;border:none;border-radius:4px;font-weight:700;cursor:pointer;">SOFT</button>
            <button class="pit-btn" id="m-tire" style="background:#ffff00;color:#000;padding:20px 40px;border:none;border-radius:4px;font-weight:700;cursor:pointer;">MEDIUM</button>
            <button class="pit-btn" id="h-tire" style="background:#ffffff;color:#000;padding:20px 40px;border:none;border-radius:4px;font-weight:700;cursor:pointer;">HARD</button>
          </div>
        `;
        document.body.appendChild(selection);
        
        const setTire = (c) => {
          this.player.resetTires(c);
          this.lapStart = performance.now();
          this.racing = true;
          this._inPit = false;
          selection.remove();
          note.remove();
        };

        document.getElementById('s-tire').onclick = () => setTire('SOFT');
        document.getElementById('m-tire').onclick = () => setTire('MEDIUM');
        document.getElementById('h-tire').onclick = () => setTire('HARD');
      }
    }, 100);
  }

  checkLap() {
    const p = this.player;
    const start = this.splinePts[0];
    const dx = p.x - start.x, dz = p.z - start.z;
    const dist = Math.sqrt(dx*dx + dz*dz);
    if (dist < TRACK_WIDTH * 1.8) {
      if (!this._nearLine) {
        this._nearLine = true;
        if (this._raceStarted) {
          this.onLapComplete();
          p.lap++;
          this.hud.flashLap(p.lap);
          if (p.lap >= LAPS_TO_WIN) { this.finished = true; this.racing = false; showFinish(this); }
        }
        this._raceStarted = true;
        p.progress = 0;
      }
    } else {
      this._nearLine = false;
      // Update progress locally
      let minD = Infinity, best = p.progress || 0;
      const searchRange = 0.1;
      for (let i = 0; i <= 20; i++) {
        const u = (best - searchRange/2 + (i/20) * searchRange + 1) % 1;
        const cp = this.curve.getPointAt(u);
        const d = (cp.x - p.x)**2 + (cp.z - p.z)**2;
        if (d < minD) { minD = d; best = u; }
      }
      p.progress = best;
      // Sector tracking
      const now = performance.now();
      const currentSector = Math.floor(best * 3); // 0, 1, 2
      const prevSector = Math.floor(p.lastSectorProgress * 3);
      if (currentSector !== prevSector && this._raceStarted) {
        const sectorTime = (now - this.lapStart) / 1000;
        p.sectorTimes[prevSector] = sectorTime;
        // Visual feedback for sectors could go here
      }
      p.lastSectorProgress = best;
    }
  }

  onLapComplete() {
    const p = this.player;
    const now = performance.now();
    const lapTime = (now - this.lapStart) / 1000;
    if (this._raceStarted) {
      if (lapTime < (p.bestLapTime || Infinity)) {
        p.bestLapTime = lapTime;
        // Purple sector / Lap flash
      }
    }
    p.sectorTimes = [0, 0, 0];
    this.lapStart = now;
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const now = performance.now();
    const dt = Math.min((now - this._lastTime) / 1000, 0.05);
    this._lastTime = now;
    if (this.racing) {
      // Player
      this.player.drsActive = this.keys.space && this.player.canUseDrs;
      this.player.update(dt, this.keys);
      // Debug
      if (this.player.speed === 0 && this.keys.w && Math.random() < 0.01) {
          console.log('Accel check:', this.player.accel, 'Eff:', (0.3 + this.player.tireWear * 0.4), 'Rain:', window._isRainy);
      }
      // AI
      this.aiList.forEach(ai => ai.update(dt));
      // Lap check
      this.checkLap();
      
      // Record data for replay during final lap
      if (this.player.lap === LAPS_TO_WIN - 1) {
        this.replayData.push(this.allCars.map(c => ({
          x: c.x, z: c.z, angle: c.angle, 
          speed: c.speed, gear: c.gear, 
          compound: c.compound, damage: c.damage,
          tireWear: c.tireWear, progress: c.progress
        })));
      }
    } else if (this.isReplaying && this.replayData.length > 0) {
      this.replayFrame = (this.replayFrame + 1) % this.replayData.length;
      const frame = this.replayData[this.replayFrame];
      frame.forEach((data, i) => {
        const car = this.allCars[i];
        car.x = data.x; car.z = data.z; car.angle = data.angle;
        car.speed = data.speed; car.gear = data.gear;
        car.compound = data.compound; car.damage = data.damage;
        car.tireWear = data.tireWear; car.progress = data.progress;
        car.syncMesh();
      });
      this.cameraMode = 1; // TV cam for replay
    }
    if (this.isRainy && this.rain) {
      const gpos = this.rain.geometry.attributes.position;
      for (let i = 0; i < gpos.count; i++) {
        let y = gpos.getY(i) - (120 * dt);
        if (y < 0) y = 200;
        gpos.setY(i, y);
      }
      gpos.needsUpdate = true;
      this.rain.position.set(this.player.x, 0, this.player.z);
    }
    this.audio.update(this.player.speed, this.player.gear, this.racing);
    this.hud.update(this.player, this.allCars, this.curve, now, this.lapStart);
    this.updateCamera();
    this.renderer.render(this.scene, this.camera);
  }

  updateCamera() {
    const p = this.player;
    if (this.cameraMode === 0) { // Chase cam
      const cx = p.x - Math.sin(p.angle)*18;
      const cz = p.z - Math.cos(p.angle)*18;
      this.camera.position.lerp(new THREE.Vector3(cx, 8, cz), 0.12);
      this.camera.lookAt(new THREE.Vector3(p.x + Math.sin(p.angle)*5, 1.5, p.z + Math.cos(p.angle)*5));
    } else { // TV cam
      const tx = p.x + 50, tz = p.z + 40;
      this.camera.position.lerp(new THREE.Vector3(tx, 30, tz), 0.04);
      this.camera.lookAt(new THREE.Vector3(p.x, 0, p.z));
    }
  }
}

// ─────────────────────────────────────────────
// 12. BOOT
// ─────────────────────────────────────────────
showSelection((team, circuit) => {
  showCountdown(() => {
    const game = new Game(team, circuit);
    game.startRacing();
  });
});
