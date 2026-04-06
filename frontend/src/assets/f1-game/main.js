'use strict';
// ─────────────────────────────────────────────
// F1 PRO SIMULATOR — main.js (Three.js r160)
// ─────────────────────────────────────────────

const TEAMS = [
  { name: 'Scuderia Ferrari', short: 'FER', color: '#e10600', cockpit: '#ff4400' },
  { name: 'Oracle Red Bull', short: 'RBR', color: '#3671c6', cockpit: '#ffd700' },
  { name: 'Mercedes AMG', short: 'MER', color: '#00d2be', cockpit: '#000000' },
  { name: 'McLaren F1', short: 'MCL', color: '#ff8700', cockpit: '#000000' },
  { name: 'Aston Martin', short: 'AMR', color: '#358c4e', cockpit: '#ffd700' },
  { name: 'Alpine F1', short: 'ALP', color: '#0078ff', cockpit: '#ff0090' },
];

const SCALE = 5.0;
const TRACK_WIDTH = 28;
const LAPS_TO_WIN = 5;

const CIRCUITS = {
  MONACO: [[0, 0], [60, -15], [110, 5], [145, 55], [155, 120], [135, 190], [90, 250], [30, 295], [-20, 335], [-15, 390], [20, 440], [80, 460], [150, 445], [195, 410], [210, 360], [195, 300], [155, 260], [100, 240], [50, 255], [10, 280], [-30, 260], [-60, 210], [-75, 150], [-60, 80], [-20, 20]],
  SILVERSTONE: [[0, 0], [100, 10], [220, 5], [330, 40], [400, 120], [420, 220], [400, 330], [340, 420], [240, 470], [120, 475], [10, 445], [-90, 390], [-155, 300], [-175, 190], [-155, 90], [-90, 20]],
  MONZA: [[0, 0], [160, 0], [310, -5], [400, 30], [430, 100], [420, 180], [380, 240], [310, 265], [220, 255], [150, 235], [90, 255], [60, 320], [70, 390], [130, 430], [220, 440], [320, 420], [410, 390], [450, 340], [450, 270], [400, 210], [310, 190], [200, 200], [110, 220], [40, 240], [-20, 210], [-40, 140], [-20, 55]],
  SPA: (function () {
    const raw = [[5.96502, 50.444251], [5.963419, 50.446033], [5.963473, 50.446184], [5.963786, 50.446188], [5.964313, 50.446019], [5.966207, 50.445387], [5.967421, 50.444779], [5.967876, 50.444463], [5.970321, 50.442606], [5.971315, 50.442168], [5.97141, 50.441824], [5.97202, 50.441069], [5.972268, 50.440655], [5.973476, 50.439424], [5.974245, 50.438642], [5.974754, 50.437784], [5.977199, 50.432382], [5.977524, 50.431331], [5.977406, 50.431218], [5.977015, 50.431048], [5.977027, 50.429747], [5.97698, 50.429469], [5.97663, 50.429224], [5.973257, 50.427739], [5.972831, 50.427678], [5.972422, 50.427805], [5.972239, 50.42805], [5.972292, 50.428305], [5.974216, 50.429205], [5.97434, 50.429431], [5.973712, 50.430723], [5.972878, 50.433452], [5.972724, 50.433744], [5.972369, 50.433999], [5.971872, 50.434164], [5.970717, 50.43423], [5.969759, 50.434065], [5.969208, 50.433782], [5.967231, 50.430845], [5.966882, 50.430534], [5.96622, 50.43044], [5.965876, 50.430421], [5.965325, 50.430624], [5.964828, 50.430713], [5.964094, 50.430548], [5.962425, 50.428927], [5.961922, 50.428762], [5.960578, 50.429257], [5.959756, 50.429761], [5.959602, 50.430209], [5.959862, 50.430779], [5.960365, 50.431463], [5.961247, 50.43216], [5.962135, 50.432712], [5.9631, 50.433136], [5.965385, 50.433895], [5.96632, 50.434357], [5.966799, 50.434744], [5.967107, 50.435106], [5.967924, 50.436261], [5.968095, 50.43686], [5.967699, 50.437624], [5.966888, 50.438991], [5.966775, 50.439273], [5.966604, 50.439919], [5.966456, 50.441404], [5.966651, 50.44156], [5.96706, 50.441541], [5.967296, 50.441626], [5.96732, 50.441701], [5.966533, 50.442559]];
    return raw.map(p => [(p[0] - 5.96502) * 55000, (p[1] - 50.444251) * 70000]);
  }()),
  SUZUKA: [[0, 0], [100, -10], [200, 10], [290, 60], [330, 140], [310, 230], [250, 300], [160, 340], [60, 340], [-30, 310], [-90, 250], [-95, 170], [-50, 110], [20, 90], [90, 110], [140, 160], [150, 230], [110, 290], [40, 320], [-30, 300], [-80, 240], [-90, 160], [-60, 90], [0, 50]]
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
    for (let i = 0; i < SMOKE_MAX; i++) {
      const p = new THREE.Mesh(geo, mat.clone());
      p.visible = false; this.scene.add(p); this.pool.push({ mesh: p, life: 0 });
    }
  }
  emit(x, y, z) {
    const p = this.pool.find(i => !i.mesh.visible);
    if (!p) return;
    p.mesh.position.set(x, y, z);
    p.mesh.rotation.x = -Math.PI / 2;
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
  const sc = isSpa ? 1 : SCALE;
  const pts = rawPts.map(([x, z]) => new THREE.Vector3(x * sc, 0, z * sc));
  const curve = new THREE.CatmullRomCurve3(pts, true);
  const N = isSpa ? 1200 : 800;
  const spline = curve.getSpacedPoints(N);

  const cachedSpline = new Float32Array(spline.length * 3);
  for (let i = 0; i < spline.length; i++) {
    cachedSpline[i * 3] = spline[i].x; cachedSpline[i * 3 + 1] = spline[i].y; cachedSpline[i * 3 + 2] = spline[i].z;
  }

  // 1. ASPHALT
  const ac = document.createElement('canvas'); ac.width = ac.height = 256;
  const ax = ac.getContext('2d');
  ax.fillStyle = '#1a1a1a'; ax.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1200; i++) {
    ax.fillStyle = i < 800 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.3)';
    ax.fillRect(Math.random() * 256, Math.random() * 256, 1, 1);
  }
  const tex = new THREE.CanvasTexture(ac);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(4, isSpa ? 150 : 80);

  const verts = [], uvs = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const p = spline[i % N], t = curve.getTangentAt((i % N) / N).normalize();
    const b = new THREE.Vector3().crossVectors(t, new THREE.Vector3(0, 1, 0)).normalize();
    verts.push(p.x + b.x * TRACK_WIDTH, 0.08, p.z + b.z * TRACK_WIDTH, p.x - b.x * TRACK_WIDTH, 0.08, p.z - b.z * TRACK_WIDTH);
    uvs.push(0, i / 8, 1, i / 8);
    if (i < N) { const j = i * 2; idx.push(j, j + 1, j + 2, j + 1, j + 3, j + 2); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  scene.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 })));

  // 2. GRAVEL TRAPS (Ribbon)
  const gVerts = [], gIdx = [];
  for (let i = 0; i <= N; i++) {
    const p = spline[i % N], t = curve.getTangentAt((i % N) / N).normalize();
    const b = new THREE.Vector3().crossVectors(t, new THREE.Vector3(0, 1, 0)).normalize();
    const w1 = TRACK_WIDTH + 2, w2 = TRACK_WIDTH + 16;
    // Left side gravel
    gVerts.push(p.x + b.x * w1, 0.05, p.z + b.z * w1, p.x + b.x * w2, 0.05, p.z + b.z * w2);
    // Right side gravel
    gVerts.push(p.x - b.x * w1, 0.05, p.z - b.z * w1, p.x - b.x * w2, 0.05, p.z - b.z * w2);
    if (i < N) {
      const j = i * 4;
      gIdx.push(j, j + 1, j + 4, j + 1, j + 5, j + 4); // Left
      gIdx.push(j + 2, j + 3, j + 6, j + 3, j + 7, j + 6); // Right
    }
  }
  const gGeo = new THREE.BufferGeometry();
  gGeo.setAttribute('position', new THREE.Float32BufferAttribute(gVerts, 3));
  gGeo.setIndex(gIdx); gGeo.computeVertexNormals();
  scene.add(new THREE.Mesh(gGeo, new THREE.MeshStandardMaterial({ color: 0xc8b86e, roughness: 1 })));

  // 3. CURBS & BARRIERS & ENVIRONMENT
  const curbGeo = new THREE.BoxGeometry(1.4, 0.2, 7.5);
  const wallGeo = new THREE.BoxGeometry(0.8, 1.0, 8.5);
  const postGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.2, 6);
  const grandGeo = new THREE.BoxGeometry(10, 8, 26);
  const crowdGeo = new THREE.BoxGeometry(9.8, 0.2, 25.8);
  const centerGeo = new THREE.PlaneGeometry(0.4, 5);

  const colors = [0xe10600, 0x3671c6, 0x00d2be, 0xff8700, 0x358c4e];

  for (let i = 0; i < N; i++) {
    const p = spline[i], t = curve.getTangentAt(i / N).normalize();
    const b = new THREE.Vector3().crossVectors(t, new THREE.Vector3(0, 1, 0)).normalize();
    const angle = Math.atan2(t.x, t.z);

    // Curbs
    if (i % 10 === 0) {
      for (let side of [-1, 1]) {
        const curb = new THREE.Mesh(curbGeo, new THREE.MeshBasicMaterial({ color: (i / 10) % 2 === 0 ? 0xffffff : 0xff0000 }));
        curb.position.set(p.x + b.x * (TRACK_WIDTH + 1.2) * side, 0.1, p.z + b.z * (TRACK_WIDTH + 1.2) * side);
        curb.rotation.y = angle;
        scene.add(curb);
      }
    }

    // Barriers
    if (i % 16 === 0) {
      for (let side of [-1, 1]) {
        const wall = new THREE.Mesh(wallGeo, new THREE.MeshStandardMaterial({ color: (i / 16) % 2 === 0 ? 0xcccccc : 0xcc0000, metalness: 0.5 }));
        wall.position.set(p.x + b.x * (TRACK_WIDTH + 18) * side, 0.5, p.z + b.z * (TRACK_WIDTH + 18) * side);
        wall.rotation.y = angle;
        scene.add(wall);
        if (i % 32 === 0) {
          const post = new THREE.Mesh(postGeo, new THREE.MeshStandardMaterial({ color: 0x333333 }));
          post.position.set(p.x + b.x * (TRACK_WIDTH + 18.5) * side, 0.6, p.z + b.z * (TRACK_WIDTH + 18.5) * side);
          scene.add(post);
        }
      }
    }

    // Grandstands
    if (i % 55 === 0 && i > 50) {
      const gColor = colors[Math.floor(i / 55) % colors.length];
      const grand = new THREE.Mesh(grandGeo, new THREE.MeshStandardMaterial({ color: gColor }));
      grand.position.set(p.x + b.x * (TRACK_WIDTH + 45), 4, p.z + b.z * (TRACK_WIDTH + 45));
      grand.rotation.y = angle;
      scene.add(grand);
      const crowd = new THREE.Mesh(crowdGeo, new THREE.MeshBasicMaterial({ color: 0x333333 }));
      crowd.position.copy(grand.position); crowd.position.y += 4.1;
      crowd.rotation.y = angle;
      scene.add(crowd);
    }

    // Center dashes
    if (i % 20 === 0) {
      const dash = new THREE.Mesh(centerGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }));
      dash.rotation.x = -Math.PI / 2; dash.rotation.z = -angle;
      dash.position.set(p.x, 0.12, p.z);
      scene.add(dash);
    }
  }

  // 4. PIT LANE BOX
  const pitGeo = new THREE.PlaneGeometry(TRACK_WIDTH * 1.5, 32);
  const pit = new THREE.Mesh(pitGeo, new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.15 }));
  const t0 = curve.getTangentAt(0);
  pit.rotation.x = -Math.PI / 2; pit.rotation.z = -Math.atan2(t0.x, t0.z);
  pit.position.set(spline[0].x, 0.1, spline[0].z); scene.add(pit);

  // 5. FINISH LINE (Checkerboard)
  const fc = document.createElement('canvas'); fc.width = 128; fc.height = 32;
  const fx = fc.getContext('2d');
  fx.fillStyle = 'white'; fx.fillRect(0, 0, 128, 32);
  fx.fillStyle = 'black';
  for (let x = 0; x < 16; x++) for (let y = 0; y < 2; y++) if ((x + y) % 2 === 0) fx.fillRect(x * 8, y * 16, 8, 16);
  const fTex = new THREE.CanvasTexture(fc); fTex.wrapS = fTex.wrapT = THREE.RepeatWrapping; fTex.repeat.set(1, 1);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(TRACK_WIDTH * 2.2, 8), new THREE.MeshBasicMaterial({ map: fTex }));
  fl.rotation.x = -Math.PI / 2; fl.rotation.z = -Math.atan2(t0.x, t0.z);
  fl.position.set(spline[0].x, 0.12, spline[0].z); scene.add(fl);

  // Ground
  const gnd = new THREE.Mesh(new THREE.PlaneGeometry(30000, 30000), new THREE.MeshStandardMaterial({ color: 0x2a5a22, roughness: 1 }));
  gnd.rotation.x = -Math.PI / 2; gnd.position.y = -0.06; gnd.receiveShadow = true;
  scene.add(gnd);

  return { curve, spline, cachedSpline, N };
}

// ─────────────────────────────────────────────
// BUILD CAR MESH
// ─────────────────────────────────────────────
function buildCarMesh(team) {
  const group = new THREE.Group(); // Main group for the car
  const c = new THREE.Color(team.color); // Main team color
  const ck = new THREE.Color(team.cockpit); // Cockpit/helmet color
  const mat = col => new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, metalness: 0.3 });
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.8 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 0.4, metalness: 0.9 });
  const brakeMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff4400, emissiveIntensity: 0.5 });
  const carbonMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5, metalness: 0.5 });

  // 1. BODY PARTS
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.38, 5.2), mat(c));
  chassis.position.y = 0.5; chassis.castShadow = true; group.add(chassis);

  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.25, 2.2), mat(c));
  nose.position.set(0, 0.42, 3.4); nose.scale.set(0.9, 0.9, 1.0); // tapered effect
  group.add(nose);

  const lSidepod = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 2.6), mat(c));
  lSidepod.position.set(-1.1, 0.45, 0.4); group.add(lSidepod);
  const rSidepod = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 2.6), mat(c));
  rSidepod.position.set(1.1, 0.45, 0.4); group.add(rSidepod);

  const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.44, 1.0), mat(ck));
  cockpit.position.set(0, 0.82, 0.1); group.add(cockpit);

  const engineCover = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 1.6), mat(c));
  engineCover.position.set(0, 0.8, -1.2); group.add(engineCover);

  // 2. FRONT WING
  const fwMain = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.08, 0.65), carbonMat);
  fwMain.position.set(0, 0.18, 4.2); fwMain.castShadow = true; group.add(fwMain);

  const fwL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.65), carbonMat);
  fwL.position.set(-1.7, 0.4, 4.2); group.add(fwL);
  const fwR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.65), carbonMat);
  fwR.position.set(1.7, 0.4, 4.2); group.add(fwR);

  const fwFlap = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.06, 0.4), mat(c));
  fwFlap.position.set(0, 0.28, 4.0); group.add(fwFlap);

  // 3. REAR WING
  const rwMain = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.08, 0.48), carbonMat);
  rwMain.position.set(0, 1.2, -2.4); rwMain.castShadow = true; group.add(rwMain);

  const rwL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.65, 0.5), carbonMat);
  rwL.position.set(-1.2, 0.9, -2.4); group.add(rwL);
  const rwR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.65, 0.5), carbonMat);
  rwR.position.set(1.2, 0.9, -2.4); group.add(rwR);

  const drsSlot = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, 0.35), mat(ck));
  drsSlot.position.set(0, 1.05, -2.4); group.add(drsSlot);

  const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.7, 0.26), carbonMat);
  pylon.position.set(0, 0.75, -2.4); group.add(pylon);

  // 4. HALO + HELMET
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.065, 8, 20, Math.PI), blackMat);
  halo.position.set(0, 1.0, 0.1); halo.rotation.z = Math.PI; group.add(halo);

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.27, 14, 14), mat(ck));
  helmet.position.set(0, 1.1, 0.2); helmet.scale.set(1, 1.12, 1.1); helmet.castShadow = true;
  group.add(helmet);

  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), new THREE.MeshStandardMaterial({
    color: 0x1a2a3a, metalness: 1, transparent: true, opacity: 0.9
  }));
  visor.position.set(0, 1.15, 0.38); visor.rotation.x = -Math.PI / 2; group.add(visor);

  // 5. FLOOR / UNDERTRAY
  const floor = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 5.0), carbonMat);
  floor.position.y = 0.3;
  group.add(floor);

  // 6. MIRRORS
  const lMirror = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.35), mat(c));
  lMirror.position.set(-1.15, 1.0, 0.9);
  group.add(lMirror);
  const rMirror = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.35), mat(c));
  rMirror.position.set(1.15, 1.0, 0.9);
  group.add(rMirror);

  // 7. BARGEBOARDS
  for (let side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 0.7), carbonMat);
      fin.position.set(1.0 * side, 0.5, 2.0 + i * 0.25);
      group.add(fin);
    }
  }

  // 8. EXHAUST
  const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.95 });
  const exL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.8, 8), exhaustMat);
  exL.position.set(-0.3, 0.7, -2.9);
  exL.rotation.x = Math.PI / 2;
  group.add(exL);
  const exR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.8, 8), exhaustMat);
  exR.position.set(0.3, 0.7, -2.9);
  exR.rotation.x = Math.PI / 2;
  group.add(exR);

  // 9. WHEELS (Bigger, thicker tires)
  const fWheels = [], rWheels = [];
  const poses = [[-1.6, 0.35, 2.2], [1.6, 0.35, 2.2], [-1.6, 0.35, -2.2], [1.6, 0.35, -2.2]];
  poses.forEach((p, i) => {
    const pivot = new THREE.Group(); pivot.position.set(...p);

    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.7, 24), tireMat);
    tire.rotation.z = Math.PI / 2; pivot.add(tire);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.72, 20), rimMat);
    rim.rotation.z = Math.PI / 2; pivot.add(rim);

    const rimCenter = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.73, 8), mat(c));
    rimCenter.rotation.z = Math.PI / 2; pivot.add(rimCenter);

    const brakeGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.3, 8), brakeMat);
    brakeGlow.rotation.z = Math.PI / 2; brakeGlow.position.x = -0.15 * (p[0] < 0 ? -1 : 1);
    pivot.add(brakeGlow);

    group.add(pivot);
    if (i < 2) fWheels.push(pivot); else rWheels.push(pivot);
  });

  // 10. HEADLIGHTS (Small glowing spheres)
  const headlightMat = new THREE.MeshBasicMaterial({ color: team.headlight, emissive: team.headlight, emissiveIntensity: 2 });
  const headlightGeo = new THREE.SphereGeometry(0.15, 8, 8);
  const lHeadlight = new THREE.Mesh(headlightGeo, headlightMat);
  lHeadlight.position.set(-0.7, 0.5, 4.2); group.add(lHeadlight);
  const rHeadlight = new THREE.Mesh(headlightGeo, headlightMat);
  rHeadlight.position.set(0.7, 0.5, 4.2); group.add(rHeadlight);

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

    this.accel = isPlayer ? 180 : 130 + Math.random() * 50;
    this.topSpeed = isPlayer ? 320 : 240 + Math.random() * 60; // Adjusted top speed for kart feel
  }

  // Only sync mesh visuals — called by AI to avoid running physics twice
  syncMesh(dt) {
    this.mesh.position.set(this.x, 0.28 + Math.sin(performance.now() * 0.012) * Math.abs(this.speed) * 0.0001, this.z);
    this.mesh.rotation.y = this.angle;
    this.fWheels.forEach(f => {
      f.rotation.y = this.steerAngle * 0.4;
      f.children.forEach(c => c.rotation.x += this.speed * dt * 0.75);
    });
    this.rWheels.forEach(r => {
      r.children.forEach(c => c.rotation.x += this.speed * dt * 0.75);
    });
  }

  update(dt, keys, game) {
    if (!keys) return;
    const td = this.getTrackDist();
    const isGravel = td > TRACK_WIDTH + 2 && td < TRACK_WIDTH + 14;
    const isWall = td > TRACK_WIDTH + 14;
    const isOff = td > TRACK_WIDTH + 6;

    const dmgM = 1 - this.damage * 0.4;
    const topEff = (isOff ? 80 : this.topSpeed * dmgM) * (this.drsActive ? 1.15 : 1);
    const accEff = this.accel * (0.4 + this.tireWear * 0.6) * dmgM * (isOff ? 0.2 : 1);

    if (keys.w) this.speed = Math.min(topEff, this.speed + accEff * dt);
    else if (keys.s) this.speed = Math.max(isOff ? -20 : -50, this.speed - 350 * dt);
    else this.speed *= Math.pow(0.985, dt * 60);

    if (isGravel) {
      this.speed *= Math.pow(0.55, dt * 60);
      this.tireWear = Math.max(0, this.tireWear - 0.001 * dt);
    }
    const prev = { x: this.x, z: this.z };
    this.x += Math.sin(this.angle) * this.speed * dt;
    this.z += Math.cos(this.angle) * this.speed * dt;

    // Barrier Collision (Reflect)
    if (isWall && Math.abs(this.speed) > 20) {
      const angle = Math.atan2(this.x - prev.x, this.z - prev.z); // Angle of impact
      this.angle = angle + Math.PI * 0.9; // More direct reflection
      this.x = prev.x; this.z = prev.z;
      this.speed = -this.speed * 0.2; // Less speed loss
      this.damage = Math.min(1, this.damage + 0.05 * (Math.abs(this.speed) / 100)); // Less damage
      if (game) game._camShake = 0.6; // Reduced camera shake
    }

    // Dynamic Understeer Turning (Adjusted for kart feel)
    const sf = Math.min(1, Math.abs(this.speed) / 80);
    const sl = 2.8 * (1 - Math.abs(this.speed) / 360 * 0.55);
    const dir = this.speed < 0 ? -1 : 1;
    let targetSteer = 0;
    if (keys.a) targetSteer = 1; else if (keys.d) targetSteer = -1;
    this.steerAngle = THREE.MathUtils.lerp(this.steerAngle, targetSteer, dt * 8);
    this.angle += this.steerAngle * sl * sf * dir * dt;

    this.gear = Math.max(1, Math.floor(Math.abs(this.speed) / 50) + 1);
    this.tireWear = Math.max(0, this.tireWear - 0.000008 * Math.abs(this.speed) * dt);

    // Anim
    this.syncMesh(dt);
  }

  getTrackDist() {
    let minD = Infinity;
    for (let i = 0; i < this.cachedSpline.length; i += 3) {
      const dx = this.cachedSpline[i] - this.x, dz = this.cachedSpline[i + 2] - this.z;
      const d = dx * dx + dz * dz;
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
      const d = (p.x - car.x) ** 2 + (p.z - car.z) ** 2;
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
    while (diff < -Math.PI) diff += Math.PI * 2; while (diff > Math.PI) diff -= Math.PI * 2;
    car.angle += diff * 4.5 * dt;

    car.speed = Math.min(this.speedTarget, car.speed + 170 * dt);
    car.x += Math.sin(car.angle) * car.speed * dt;
    car.z += Math.cos(car.angle) * car.speed * dt;
    car.syncMesh(dt); // visuals only — no double physics
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
    this.cameraMode = 0; // 0: CHASE, 1: COCKPIT, 2: TV, 3: ORBIT (for menu)
    this._camShake = 0; // Camera shake intensity
    this.keys = { w: 0, a: 0, s: 0, d: 0, space: 0 };

    this.scene = new THREE.Scene();
    // Skybox - Gradient from deep blue to horizon orange/purple at dusk
    const skyGeo = new THREE.SphereGeometry(5000, 32, 15);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x000033) }, // Deep blue
        bottomColor: { value: new THREE.Color(0x8a2be2) }, // BlueViolet (purple-ish)
        offset: { value: 33 },
        exponent: { value: 0.6 }
      },
      vertexShader: `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
            }
        `,
      fragmentShader: `
            uniform vec3 topColor;
            uniform vec3 bottomColor;
            uniform float offset;
            uniform float exponent;
            varying vec3 vWorldPosition;
            void main() {
                float h = normalize( vWorldPosition + offset ).y;
                gl_FragColor = vec4( mix( bottomColor, topColor, max( pow( max( h , 0.0), exponent ), 0.0 ) ), 1.0 );
            }
        `,
      side: THREE.BackSide
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(sky);

    // Improved Lighting
    const sun = new THREE.DirectionalLight(0xffddaa, 2.5); // Warmer color, increased intensity
    sun.position.set(300, 800, 400); // Higher and slightly more forward
    sun.castShadow = true;
    sun.shadow.mapSize.width = 4096; // Increased shadow map resolution
    sun.shadow.mapSize.height = 4096;
    const f = this.isSpa ? 3000 : 1000; // Adjusted shadow camera frustum
    sun.shadow.camera.left = -f; sun.shadow.camera.right = f;
    sun.shadow.camera.top = f; sun.shadow.camera.bottom = -f;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 2000;
    this.scene.add(sun);

    this.scene.add(new THREE.AmbientLight(0x404040, 0.8)); // Increased ambient light intensity

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    document.body.appendChild(this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 1, 8000);

    const track = buildTrack(this.scene, CIRCUITS[circuitName], circuitName);
    this.curve = track.curve; this.cachedSpline = track.cachedSpline;
    this.smoke = new ParticleSystem(this.scene);

    this.player = new CarPhysics(team, true, this.cachedSpline);
    const p0 = track.spline[0], t0 = this.curve.getTangentAt(0);
    this.player.x = p0.x; this.player.z = p0.z; this.player.angle = Math.atan2(t0.x, t0.z);
    this.scene.add(this.player.mesh); this.allCars.push(this.player);

    TEAMS.filter(t => t.name !== team.name).slice(0, 5).forEach((t, i) => {
      const car = new CarPhysics(t, false, this.cachedSpline);
      const row = Math.floor(i / 2) + 1, side = i % 2 === 0 ? 1 : -1;
      const b = new THREE.Vector3().crossVectors(t0, new THREE.Vector3(0, 1, 0)).normalize();
      car.x = p0.x + b.x * side * 7 - t0.x * row * 16; car.z = p0.z + b.z * side * 7 - t0.z * row * 16; car.angle = this.player.angle;
      this.scene.add(car.mesh); this.allCars.push(car);
      this.aiList.push(new AIController(car, this.curve, i + 1));
    });

    this._setupMinimap(track.spline);
    this._setupAudio();
    this._setupControls();
    this._lastPos = 1; this._lastTime = performance.now();
    this._inPit = false; this.bestLap = Infinity;
    this.animate();
  }

  _setupMinimap(spline) {
    this._mmSpline = spline;
    const xs = spline.map(p => p.x), zs = spline.map(p => p.z);
    this._mmMinX = Math.min(...xs); this._mmMaxX = Math.max(...xs);
    this._mmMinZ = Math.min(...zs); this._mmMaxZ = Math.max(...zs);
    // inject canvas if not in HTML
    let mc = document.getElementById('minimap-canvas');
    if (!mc) {
      mc = document.createElement('canvas');
      mc.id = 'minimap-canvas'; mc.width = 160; mc.height = 160;
      mc.style.cssText = 'position:fixed;bottom:22px;right:22px;z-index:12;border-radius:6px;border:1px solid #333;background:rgba(0,0,0,0.82);';
      const hud = document.getElementById('hud'); if (hud) hud.appendChild(mc);
    }
    this._mmCtx = mc.getContext('2d');
  }

  _drawMinimap() {
    if (!this._mmCtx) return;
    const ctx = this._mmCtx, pts = this._mmSpline;
    const range = Math.max(this._mmMaxX - this._mmMinX, this._mmMaxZ - this._mmMinZ) || 1;
    const sc = 140 / range;
    const tx = x => (x - this._mmMinX) * sc + 10;
    const tz = z => (z - this._mmMinZ) * sc + 10;
    ctx.clearRect(0, 0, 160, 160);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 3;
    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(tx(p.x), tz(p.z)) : ctx.lineTo(tx(p.x), tz(p.z)));
    ctx.closePath(); ctx.stroke();
    this.allCars.forEach(car => {
      ctx.fillStyle = car === this.player ? '#fff' : car.team.color;
      ctx.beginPath(); ctx.arc(tx(car.x), tz(car.z), car === this.player ? 5 : 3, 0, Math.PI * 2); ctx.fill();
    });
  }

  doPitStop() {
    if (!this.racing || this._inPit) return;
    const prog = this.player.progress;
    if (prog > 0.06 && prog < 0.94) {
      this._toast('APPROACH START LINE FOR PIT', '#e10600'); return;
    }
    if (Math.abs(this.player.speed) > 65) {
      this._toast('SLOW DOWN FOR PIT ENTRY', '#ffd700'); return;
    }
    this._inPit = true; this.racing = false; this.player.speed = 0;
    const note = document.createElement('div');
    note.style.cssText = 'position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.88);z-index:50;font-family:Orbitron,sans-serif;color:#ffd700;gap:10px;';
    note.innerHTML = '<div style="font-size:2.5rem;font-weight:900">PIT STOP</div><div style="color:#aaa;font-size:0.85rem">FRESH TIRES</div>' +
      '<div style="width:260px;height:6px;background:#333;border-radius:3px;margin-top:8px"><div id="_pb" style="height:100%;width:0%;background:#e10600;border-radius:3px;transition:width 0.1s"></div></div>' +
      '<div id="_pc" style="font-size:1.2rem;font-weight:700;color:#e10600">3.0s</div>';
    document.body.appendChild(note);
    let elapsed = 0;
    const iv = setInterval(() => {
      elapsed += 100;
      const pb = document.getElementById('_pb'); if (pb) pb.style.width = Math.min(100, elapsed / 30) + '%';
      const pc = document.getElementById('_pc'); if (pc) pc.innerText = ((3000 - elapsed) / 1000).toFixed(1) + 's';
      if (elapsed >= 3000) {
        clearInterval(iv); this.player.tireWear = 1.0;
        this.player.damage = Math.max(0, this.player.damage - 0.3);
        this.racing = true; this._inPit = false; note.remove();
      }
    }, 100);
  }

  _toast(msg, color) {
    let t = document.getElementById('_gt');
    if (!t) {
      t = document.createElement('div'); t.id = '_gt';
      t.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.9);font-family:Orbitron,sans-serif;font-size:0.9rem;font-weight:700;padding:14px 28px;border-radius:6px;z-index:60;pointer-events:none;transition:opacity 0.3s;';
      document.body.appendChild(t);
    }
    t.style.color = color; t.style.border = `2px solid ${color}`;
    t.innerText = msg; t.style.opacity = '1';
    clearTimeout(this._toastT); this._toastT = setTimeout(() => t.style.opacity = '0', 2500);
  }

  _showFinish() {
    const sorted = [...this.allCars].sort((a, b) => b.lap - a.lap || b.progress - a.progress);
    const medals = ['🥇', '🥈', '🥉'];
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;z-index:80;background:rgba(0,0,0,0.95);display:flex;flex-direction:column;align-items:center;justify-content:center;color:white;font-family:Orbitron,sans-serif;';
    d.innerHTML = '<div style="font-size:3.5rem;font-weight:900;color:#e10600;margin-bottom:1.5rem;letter-spacing:0.1em">RACE OVER</div>' +
      sorted.slice(0, 3).map((c, i) => `<div style="font-size:1.4rem;margin:6px 0;color:${c === this.player ? '#ffd700' : '#ccc'}">${medals[i]} ${c.team.name}</div>`).join('') +
      '<button onclick="location.reload()" style="margin-top:2rem;padding:14px 48px;background:#e10600;color:white;border:none;font-family:Orbitron,sans-serif;font-size:0.9rem;font-weight:700;cursor:pointer;border-radius:4px;letter-spacing:0.15em">RESTART</button>';
    document.body.appendChild(d);
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
      if (v === 'w' || e.key === 'ArrowUp') k.w = 1; if (v === 's' || e.key === 'ArrowDown') k.s = 1;
      if (v === 'a' || e.key === 'ArrowLeft') k.a = 1; if (v === 'd' || e.key === 'ArrowRight') k.d = 1;
      if (v === ' ') k.space = 1; if (v === 'c') this.cameraMode = this.cameraMode === 'chase' ? 'cockpit' : 'chase';
      // Fix 3: P key triggers pit stop
      if (v === 'p') this.doPitStop();
    };
    window.onkeyup = e => {
      const v = e.key.toLowerCase();
      if (v === 'w' || e.key === 'ArrowUp') k.w = 0; if (v === 's' || e.key === 'ArrowDown') k.s = 0;
      if (v === 'a' || e.key === 'ArrowLeft') k.a = 0; if (v === 'd' || e.key === 'ArrowRight') k.d = 0;
      if (v === ' ') k.space = 0;
    };
    const b = (id, key) => {
      const el = document.getElementById(id); if (!el) return;
      el.ontouchstart = (e) => { k[key] = 1; e.preventDefault(); }; el.ontouchend = (e) => { k[key] = 0; e.preventDefault(); };
    };
    b('t-left', 'a'); b('t-right', 'd'); b('t-gas', 'w'); b('t-brake', 's'); b('t-drs', 'space');
    // Fix 3: wire pit touch button
    const pitBtn = document.getElementById('t-pit');
    if (pitBtn) { pitBtn.ontouchstart = e => { this.doPitStop(); e.preventDefault(); }; pitBtn.onclick = () => this.doPitStop(); }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const now = performance.now(), dt = Math.min((now - this._lastTime) / 1000, 0.05);
    this._lastTime = now;

    if (this.racing) {
      this.checkLap(); // Set player.drsActive & progress
      this.player.update(dt, this.keys, this);
      this.aiList.forEach(ai => ai.update(dt));
      this.handleCollisions(dt);
      if (this.player.getTrackDist() > TRACK_WIDTH + 6 && Math.abs(this.player.speed) > 100) {
        this.smoke.emit(this.player.x, 0.2, this.player.z);
      }
    }
    this.smoke.update(dt);
    this.updateHUD();
    // Fix 1: draw minimap every frame
    this._drawMinimap();
    this.updateAudio();
    this.updateCamera();
    this.renderer.render(this.scene, this.camera);
  }

  handleCollisions(dt) {
    for (let i = 0; i < this.allCars.length; i++) {
      for (let j = i + 1; j < this.allCars.length; j++) {
        const c1 = this.allCars[i], c2 = this.allCars[j];
        const dx = c2.x - c1.x, dz = c2.z - c1.z, distSq = dx * dx + dz * dz;
        if (distSq < 18) {
          const dist = Math.sqrt(distSq) || 0.1;
          const nx = dx / dist, nz = dz / dist;
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
    const dist = Math.sqrt((p.x - s0.x) ** 2 + (p.z - s0.z) ** 2);
    const near = dist < threshold;
    if (near && !this._near) {
      this._near = true;
      if (this._started) {
        p.lap++; this.lapStart = performance.now();
        const msg = document.getElementById('lap-msg');
        msg.innerText = `LAP ${p.lap}`; msg.style.opacity = 1; setTimeout(() => msg.style.opacity = 0, 2000);
        if (p.lap > LAPS_TO_WIN) { this.racing = false; this._showFinish(); return; }
      } else this._started = true;
    } else if (!near) this._near = false;

    let best = p.progress || 0, bestD = Infinity;
    for (let i = 0; i <= 40; i++) {
      const u = ((p.progress - 0.06) + i / 40 * 0.12 + 1) % 1;
      const cp = this.curve.getPointAt(u);
      const dd = (cp.x - p.x) ** 2 + (cp.z - p.z) ** 2;
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
    el('rpm-bar').style.width = Math.min(100, (Math.abs(p.speed) % 70) * 1.5) + '%';

    const sorted = [...this.allCars].sort((a, b) => b.lap - a.lap || b.progress - a.progress);
    const pos = sorted.indexOf(p) + 1;
    if (pos < this._lastPos) {
      const ov = el('overtake-msg'); if (ov) { ov.style.opacity = 1; setTimeout(() => ov.style.opacity = 0, 2000); }
    }
    this._lastPos = pos;
    el('pos').innerText = `POS: ${pos}${pos === 1 ? 'st' : pos === 2 ? 'nd' : pos === 3 ? 'rd' : 'th'}`;

    el('lb-rows').innerHTML = sorted.map((car, i) => {
      const gap = i === 0 ? 'LEADER' : `+${((sorted[0].lap - car.lap + sorted[0].progress - car.progress) * 110).toFixed(1)}s`;
      return `<div style="display:flex;justify-content:space-between;color:${car === p ? '#fff' : '#888'}"><span>P${i + 1} ${car.team.short}</span><span>${gap}</span></div>`;
    }).join('');

    const elapsed = this._started ? (performance.now() - this.lapStart) / 1000 : 0;
    const f = t => `${Math.floor(t / 60).toString().padStart(2, '0')}:${Math.floor(t % 60).toString().padStart(2, '0')}.${Math.floor((t % 1) * 1000).toString().padStart(3, '0')}`;
    el('hud-timer').innerText = f(elapsed);
    el('lap').innerText = `${p.lap}/${LAPS_TO_WIN}`;

    // Fix 4a: DRS status
    const drsEl = el('drs-msg');
    if (drsEl) {
      if (p.drsActive) { drsEl.innerText = 'DRS ACTIVE'; drsEl.style.color = '#00ff88'; drsEl.style.textShadow = '0 0 8px #00ff88'; }
      else if (p.canUseDrs) { drsEl.innerText = 'DRS AVAILABLE'; drsEl.style.color = '#ffff00'; drsEl.style.textShadow = 'none'; }
      else { drsEl.innerText = 'DRS LOCKED'; drsEl.style.color = '#444'; drsEl.style.textShadow = 'none'; }
    }

    // Fix 4b: best lap tracking
    if (this._started && elapsed > 5 && elapsed < this.bestLap) this.bestLap = elapsed;
    const bEl = el('best'); if (bEl) bEl.innerText = this.bestLap < Infinity ? f(this.bestLap) : '--:--.---';

    // Fix 4c: tire wear color (green -> red)
    for (let i = 0; i < 4; i++) { const t = el(`t${i}`); if (t) t.style.background = `rgb(${Math.floor((1 - p.tireWear) * 255)},${Math.floor(p.tireWear * 255)},0)`; }

    // Fix 4d: damage display
    const dmgEl = el('dmg'); if (dmgEl) { dmgEl.innerText = Math.floor(p.damage * 100) + '%'; dmgEl.style.color = p.damage > 0.5 ? '#f00' : p.damage > 0.1 ? '#ff0' : '#888'; }
  }

  updateAudio() {
    if (!this._audio) return;
    const { ac, g, o1, o2 } = this._audio;
    if (!this.racing) { g.gain.setTargetAtTime(0, ac.currentTime, 0.1); return; }
    g.gain.setTargetAtTime(0.04, ac.currentTime, 0.1);
    const freq = 60 + Math.abs(this.player.speed) * 2.2 + this.player.gear * 12;
    o1.frequency.setTargetAtTime(freq, ac.currentTime, 0.08);
    o2.frequency.setTargetAtTime(freq, ac.currentTime, 0.08);
  }

  updateCamera(dt) {
    const p = this.player;
    if (this.cameraMode === 0) { // CHASE — tighter, more dynamic
      const dist = 22 + Math.abs(p.speed) * 0.04;
      const height = 7 + Math.abs(p.speed) * 0.012;
      const cx = p.x - Math.sin(p.angle) * dist;
      const cz = p.z - Math.cos(p.angle) * dist;
      this.camera.position.lerp(new THREE.Vector3(cx, height, cz), 0.13);
      this.camera.lookAt(p.x + Math.sin(p.angle) * 8, 1.2, p.z + Math.cos(p.angle) * 8);
    } else if (this.cameraMode === 1) { // COCKPIT (onboard)
      this.camera.position.set(p.x + Math.sin(p.angle) * 0.3, 1.05 + 0.28, p.z + Math.cos(p.angle) * 0.3);
      this.camera.lookAt(p.x + Math.sin(p.angle) * 30, 0.9, p.z + Math.cos(p.angle) * 30);
    } else { // TV CAM — cinematic side angle
      const tvX = p.x + Math.cos(p.angle) * 40;
      const tvZ = p.z - Math.sin(p.angle) * 40;
      this.camera.position.lerp(new THREE.Vector3(tvX, 18, tvZ), 0.05);
      this.camera.lookAt(p.x, 1, p.z);
    }

    // Camera shake
    const shake = (this._camShake || 0);
    this._camShake = Math.max(0, shake - dt * 3);
    const sx = (Math.random() - 0.5) * shake * 3;
    const sy = (Math.random() - 0.5) * shake * 2;
    this.camera.position.x += sx;
    this.camera.position.y += sy;
  }
}

// ─────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────
(function init() {
  const tc = document.getElementById('team-cards'), cc = document.getElementById('circuit-cards'), sb = document.getElementById('start-btn'), cl = document.getElementById('circuit-label');
  let selT, selC;

  TEAMS.forEach(t => {
    const d = document.createElement('div'); d.className = 'card'; d.innerHTML = `<div class="card-color" style="background:${t.color}"></div><div class="card-short">${t.short}</div><div class="card-name">${t.name}</div>`;
    d.onclick = () => {
      [...tc.children].forEach(c => c.classList.remove('selected')); d.classList.add('selected');
      selT = t; cl.style.display = 'block'; cc.style.display = 'flex';
    };
    tc.appendChild(d);
  });

  Object.keys(CIRCUITS).forEach(c => {
    const d = document.createElement('div'); d.className = 'card'; d.innerHTML = `<div class="card-short" style="font-size:0.8rem">${c}</div><div class="card-name">GP Circuit</div>`;
    d.onclick = () => { [...cc.children].forEach(c => c.classList.remove('selected')); d.classList.add('selected'); selC = c; sb.style.display = 'block'; };
    cc.appendChild(d);
  });

  sb.onclick = () => {
    document.getElementById('overlay').style.display = 'none';
    const ov = document.getElementById('countdown-overlay'); ov.style.display = 'flex';
    const game = new Game(selT, selC);
    let step = 0;
    const iv = setInterval(() => {
      if (step < 5) {
        document.getElementById(`l${++step}`).classList.add('active');
      } else {
        clearInterval(iv);
        document.querySelectorAll('.light-unit').forEach(l => { l.classList.remove('active'); l.classList.add('go'); });
        document.getElementById('countdown-text').innerText = 'GO!';
        setTimeout(() => { ov.style.display = 'none'; document.getElementById('hud').style.display = 'block'; game.racing = true; }, 800);
      }
    }, 1000);
  };
})();
