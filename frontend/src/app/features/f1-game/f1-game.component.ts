import { Component, ElementRef, HostListener, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import * as THREE from 'three';

/* ═══════════════════════════════════════════════════════
   LEGO F1 GP (Advanced 3D WebGL Engine)
   ═══════════════════════════════════════════════════════ */

interface F1Team { id: number; name: string; c1: number; c2: number; c3: number; }
interface F1Track { name: string; biome: string; waypoints: {x:number, y:number}[] }

@Component({
  selector: 'app-f1-game',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './f1-game.component.html',
  styleUrls: ['./f1-game.component.scss']
})
export class F1GameComponent implements AfterViewInit, OnDestroy {
  @ViewChild('gameCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private animationId!: number;
  private carMeshes: { [id: number]: THREE.Group } = {};
  math = Math;

  totalLaps = 3;
  trackWidth = 180;
  
  tracks: F1Track[] = [
    { name: 'Silverstone GP', biome: 'grassland', waypoints: [{x:150, y:150}, {x:2000, y:150}, {x:2000, y:1000}, {x:150, y:1000}, {x:150, y:150}] },
    { name: 'Monaco GP', biome: 'night', waypoints: [{x:200, y:200}, {x:800, y:120}, {x:1400, y:250}, {x:1300, y:550}, {x:500, y:730}, {x:150, y:450}, {x:200, y:200}] },
    { name: 'Monza', biome: 'grassland', waypoints: [{x:100, y:100}, {x:2800, y:100}, {x:2900, y:500}, {x:2800, y:900}, {x:100, y:900}, {x:100, y:100}] },
    { name: 'Bahrain GP', biome: 'desert', waypoints: [{x:300, y:100}, {x:1800, y:100}, {x:2000, y:500}, {x:1000, y:900}, {x:200, y:600}, {x:300, y:100}] },
    { name: 'Spa-Francorchamps', biome: 'grassland', waypoints: [{x:150, y:150}, {x:800, y:50}, {x:1500, y:50}, {x:2500, y:400}, {x:2200, y:1200}, {x:1000, y:1400}, {x:300, y:800}, {x:150, y:150}] },
    { name: 'Interlagos', biome: 'grassland', waypoints: [{x:150, y:100}, {x:1000, y:50}, {x:1200, y:500}, {x:600, y:600}, {x:1000, y:1000}, {x:150, y:900}, {x:150, y:100}] }
  ];
  currentTrackIndex = 0;

  teams: F1Team[] = [
    { id: 0, name: 'Red Bull', c1: 0x0600ef, c2: 0xfcd700, c3: 0xcc0000 },
    { id: 1, name: 'Mercedes', c1: 0xa0a0a0, c2: 0x00d2be, c3: 0x111111 },
    { id: 2, name: 'Ferrari', c1: 0xdc0000, c2: 0x111111, c3: 0xffd700 },
    { id: 3, name: 'McLaren', c1: 0xff8700, c2: 0x111111, c3: 0x47c7fc },
    { id: 4, name: 'Aston Martin', c1: 0x006f62, c2: 0xcedc00, c3: 0x111111 },
    { id: 5, name: 'Alpine', c1: 0x0090ff, c2: 0xff90c3, c3: 0x111111 },
    { id: 6, name: 'Williams', c1: 0x00a0fe, c2: 0x041e42, c3: 0x111111 },
    { id: 7, name: 'RB', c1: 0x1534bf, c2: 0xffffff, c3: 0xff0000 },
    { id: 8, name: 'Sauber', c1: 0x00e701, c2: 0x111111, c3: 0x000000 },
    { id: 9, name: 'Haas', c1: 0xffffff, c2: 0x111111, c3: 0xe60000 }
  ];
  
  selectedTeamId = 0; // The team the player drives for

  biomes: any = {
    grassland: { ground: 0x1DA15C, sky: 0x3B82F6, ambient: 0xffffff, dIntensity: 1.0 },
    night: { ground: 0x222222, sky: 0x050510, ambient: 0xffffff, dIntensity: 0.3 },
    desert: { ground: 0xD2B48C, sky: 0xFFA07A, ambient: 0xffeebb, dIntensity: 0.9 }
  };

  player: any = { health: 100, tireWear: 1.0, lap: 0, speed: 0 };
  aiCars: any[] = [];
  gamePhase: 'start' | 'racing' | 'finished' = 'start';
  countdown = 3;
  lastTime = 0;

  constructor() { this.resetGameLogic(); }

  ngAfterViewInit() {
    this.init3D();
    this.buildScene();
    this.startGameLoop();
  }

  ngOnDestroy() { 
    cancelAnimationFrame(this.animationId); 
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
    }
  }

  // --- 3D SETUP ---
  private init3D() {
    const canvas = this.canvasRef.nativeElement;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(1400, 750);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1400 / 750, 1, 4000);
  }

  private buildScene() {
    // Prevent WebGL memory leaks
    while(this.scene.children.length > 0) { 
      const obj = this.scene.children[0] as any;
      if (obj.traverse) {
        obj.traverse((child: any) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach((m: any) => m.dispose());
            else child.material.dispose();
          }
        });
      }
      this.scene.remove(obj); 
    }

    const track = this.tracks[this.currentTrackIndex];
    const biome = this.biomes[track.biome];

    this.scene.background = new THREE.Color(biome.sky); 
    this.scene.fog = new THREE.Fog(biome.sky, 500, 2000);

    const ambientLight = new THREE.AmbientLight(biome.ambient, 0.5);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, biome.dIntensity);
    dirLight.position.set(500, 1000, 500);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 2500;
    dirLight.shadow.camera.bottom = -2500;
    dirLight.shadow.camera.left = -2500;
    dirLight.shadow.camera.right = 2500;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 4000;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    this.scene.add(dirLight);

    // Floor Baseplate
    const groundGeo = new THREE.BoxGeometry(6000, 10, 6000);
    const groundMat = new THREE.MeshStandardMaterial({ color: biome.ground, roughness: 0.9, metalness: 0 }); 
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.set(1000, -5, 1000);
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Track Assembly
    const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 });
    const kerbRed = new THREE.MeshStandardMaterial({ color: 0xD01012, roughness: 0.4 }); 
    const kerbWhite = new THREE.MeshStandardMaterial({ color: 0xF4F4F4, roughness: 0.4 }); 

    for(let i=0; i<track.waypoints.length; i++) {
        const p1 = track.waypoints[i];
        const p2 = track.waypoints[(i+1)%track.waypoints.length];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const angle = Math.atan2(dy, dx);
        
        const road = new THREE.Group();
        
        const roadMesh = new THREE.Mesh(new THREE.BoxGeometry(dist + this.trackWidth, 2, this.trackWidth), asphaltMat);
        roadMesh.receiveShadow = true;
        road.add(roadMesh);

        // Kerbs
        const numKerbs = Math.floor(dist / 40);
        for(let k=0; k<numKerbs; k++) {
            const mat = k % 2 === 0 ? kerbRed : kerbWhite;
            const kerb1 = new THREE.Mesh(new THREE.BoxGeometry(40, 4, 12), mat);
            kerb1.position.set(-dist/2 + k*40 + 20, 1, this.trackWidth/2 + 6);
            kerb1.castShadow = true; kerb1.receiveShadow = true;
            road.add(kerb1);

            const kerb2 = new THREE.Mesh(new THREE.BoxGeometry(40, 4, 12), mat);
            kerb2.position.set(-dist/2 + k*40 + 20, 1, -this.trackWidth/2 - 6);
            kerb2.castShadow = true; kerb2.receiveShadow = true;
            road.add(kerb2);
        }

        road.position.set(p1.x + dx/2, 1, p1.y + dy/2);
        road.rotation.y = -angle;
        this.scene.add(road);
    }

    // Spawn Player
    this.carMeshes = {};
    const playerTeam = this.teams.find(t => t.id === this.selectedTeamId) || this.teams[0];
    const pMesh = this.createAdvancedLegoCar(playerTeam.c1, playerTeam.c2, playerTeam.c3);
    this.scene.add(pMesh);
    this.carMeshes[0] = pMesh;

    // Spawn AI
    this.aiCars.forEach(ai => {
        const m = this.createAdvancedLegoCar(ai.c1, ai.c2, ai.c3);
        this.scene.add(m);
        this.carMeshes[ai.id] = m;
    });
  }

  private createAdvancedLegoCar(c1: number, c2: number, c3: number): THREE.Group {
    const car = new THREE.Group();
    const mat1 = new THREE.MeshStandardMaterial({ color: c1, roughness: 0.1, metalness: 0.2 }); // Glossy Plastic
    const mat2 = new THREE.MeshStandardMaterial({ color: c2, roughness: 0.1, metalness: 0.2 });
    const mat3 = new THREE.MeshStandardMaterial({ color: c3, roughness: 0.1, metalness: 0.2 });
    const black = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.2 });

    const addBlock = (w:number, h:number, d:number, mat:any, x:number, y:number, z:number) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = true; mesh.receiveShadow = true;
      car.add(mesh);
    };
    const addStuds = (w:number, d:number, mat:any, xBase:number, yBase:number, zBase:number) => {
      const studGeom = new THREE.CylinderGeometry(1.2, 1.2, 1.5, 8);
      const cols = Math.floor(w/5); const rows = Math.floor(d/5);
      for(let i=0; i<cols; i++) {
        for(let j=0; j<rows; j++) {
          const stud = new THREE.Mesh(studGeom, mat);
          stud.position.set(xBase - w/2 + 2.5 + i*5, yBase, zBase - d/2 + 2.5 + j*5);
          stud.castShadow = true; car.add(stud);
        }
      }
    };

    // Central Chassis
    addBlock(40, 6, 12, mat1, 0, 5, 0);       
    addBlock(20, 5, 8, mat2, 30, 4.5, 0);     // Nose cone
    addStuds(10, 8, mat2, 35, 7, 0);          // Nose studs

    // Front Wing (Wide multi-plane)
    addBlock(6, 2, 30, mat1, 40, 3, 0);       // Main plane
    addBlock(4, 1.5, 30, mat3, 38, 4.5, 0);   // Upper plane
    addBlock(6, 6, 2, black, 40, 5, 16);      // Left Endplate
    addBlock(6, 6, 2, black, 40, 5, -16);     // Right Endplate
    addStuds(6, 30, mat1, 40, 4.5, 0);

    // Sidepods (Thick aerodynamic boxes on side)
    addBlock(18, 6, 8, mat1, 0, 5, 10);       // Left pod
    addBlock(18, 6, 8, mat1, 0, 5, -10);      // Right pod
    addBlock(16, 4, 8, mat2, 0, 10, 10);      // Left pod intake/cover
    addBlock(16, 4, 8, mat2, 0, 10, -10);     // Right pod intake/cover
    
    // Engine Cover / Airbox
    addBlock(16, 8, 8, mat2, -10, 10, 0);
    addBlock(10, 6, 4, mat3, -10, 17, 0);     // Top airbox intake
    
    // Rear Wing (Complex)
    addBlock(8, 2, 30, mat1, -22, 15, 0);     // Main plane
    addBlock(6, 1.5, 30, mat2, -20, 17, 0);   // DRS flap
    addBlock(12, 14, 2, black, -21, 10, 15);  // Left endplate
    addBlock(12, 14, 2, black, -21, 10, -15); // Right endplate
    addBlock(4, 10, 6, black, -16, 9, 0);     // Central support pillar
    addStuds(8, 30, mat1, -22, 16, 0);

    // Cockpit & Halo
    addBlock(12, 2, 8, black, 10, 9, 0);      // Cockpit hole
    
    const helmet = new THREE.Mesh(new THREE.BoxGeometry(4,4,4), helmetMat); // Driver helmet
    helmet.position.set(10, 11, 0); helmet.castShadow = true;
    car.add(helmet);

    const haloMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
    const haloFront = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 6), haloMat);
    haloFront.position.set(16, 11, 0); haloFront.castShadow = true; car.add(haloFront);
    const haloRing = new THREE.Mesh(new THREE.BoxGeometry(10, 1, 10), haloMat);
    haloRing.position.set(10, 14, 0); haloRing.castShadow = true; car.add(haloRing);

    // Wheels
    const tireGeom = new THREE.CylinderGeometry(7, 7, 7, 24);
    tireGeom.rotateX(Math.PI / 2);
    const wheelsPos = [
      { x: 26, z: 14 }, { x: 26, z: -14 },
      { x: -16, z: 14 }, { x: -16, z: -14 }
    ];
    wheelsPos.forEach(p => {
      const w = new THREE.Mesh(tireGeom, black);
      w.position.set(p.x, 7, p.z);
      w.castShadow = true; w.receiveShadow = true;
      car.add(w);
      // Rims
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 7.2, 16), mat2);
      rim.position.set(p.x, 7, p.z); rim.rotateX(Math.PI / 2);
      car.add(rim);
    });

    car.scale.set(0.8, 0.8, 0.8);
    return car;
  }

  // --- LOGIC ---
  resetGame() {
    this.resetGameLogic();
    if(this.scene) {
        this.buildScene();
    }
  }

  resetGameLogic() {
    const track = this.tracks[this.currentTrackIndex];
    const sx = track.waypoints[0].x;
    const sy = track.waypoints[0].y;
    
    this.player = {
      id: 0, x: sx + 40, y: sy - 20, angle: 0, speed: 0, lap: 0,
      steeringAngle: 0, tireWear: 1.0, health: 100, targetWP: 1, invuln: 0
    };
    
    // Filter out the player's team, then assign AI to the remaining grid
    const remainingTeams = this.teams.filter(t => t.id !== this.selectedTeamId);
    
    this.aiCars = remainingTeams.map((team, i) => ({
      id: team.id, x: sx - (i * 70) - 40, y: sy + (i % 2 === 0 ? 40 : -40), 
      angle: 0, speed: 0, lap: 0, targetWP: 1, c1: team.c1, c2: team.c2, c3: team.c3, health: 100, invuln: 0
    }));
    
    this.gamePhase = 'start';
    this.countdown = 3;
    this.lastTime = performance.now();
  }

  onTrackChange(event: any) { this.currentTrackIndex = +event.target.value; this.resetGame(); }
  onTeamChange(event: any) { this.selectedTeamId = +event.target.value; this.resetGame(); }

  private keys: { [key: string]: boolean } = {};

  @HostListener('window:keydown', ['$event']) 
  onKeyDown(e: KeyboardEvent) { 
    this.keys[e.key] = true; 
    this.keys[e.key.toLowerCase()] = true; 
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault(); 
    }
  }

  @HostListener('window:keyup', ['$event']) 
  onKeyUp(e: KeyboardEvent) { 
    this.keys[e.key] = false; 
    this.keys[e.key.toLowerCase()] = false;
  }

  private startGameLoop() {
    const loop = (time: number) => {
      const dt = Math.min((time - this.lastTime) / 1000, 0.1);
      this.lastTime = time;
      this.update(dt);
      this.render3D();
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  private update(dt: number) {
    if (this.gamePhase === 'start') {
      this.countdown -= dt;
      if (this.countdown <= 0) this.gamePhase = 'racing';
      return;
    }
    if (this.gamePhase !== 'racing') return;

    this.updateCar(this.player, this.keys, dt);
    this.aiCars.forEach(ai => this.updateAI(ai, dt));
    this.checkCollisions(dt);
  }

  private checkWaypoint(car: any) {
    const track = this.tracks[this.currentTrackIndex];
    if (car.targetWP !== undefined) {
      const target = track.waypoints[car.targetWP];
      const dx = target.x - car.x, dy = target.y - car.y;
      if (Math.sqrt(dx*dx + dy*dy) < 180) { // Large buffer so AI definitely hit it
        car.targetWP = (car.targetWP + 1) % track.waypoints.length;
        if (car.targetWP === 1) {
          car.lap++;
          if (car.id === 0 && car.lap >= this.totalLaps) {
            this.gamePhase = 'finished';
          }
        }
      }
    }
  }

  private updateCar(car: any, input: any, dt: number) {
    if (car.invuln > 0) car.invuln -= dt;

    const isDestroyed = car.health <= 0;
    
    // --- MASSIVE SPEED BOOST ---
    const accel = isDestroyed ? 0 : 1200; 
    const friction = 0.97;
    const turn = isDestroyed ? 0 : 4.4;

    if (input.ArrowUp || input.w) car.speed += accel * dt;
    if (input.ArrowDown || input.s) car.speed -= accel * dt * 0.7;
    car.speed *= friction;
    
    if (isDestroyed) car.speed *= 0.9;

    if (Math.abs(car.speed) > 10) {
      if (input.ArrowLeft || input.a) car.angle -= turn * dt * (car.speed / 600);
      if (input.ArrowRight || input.d) car.angle += turn * dt * (car.speed / 600);
    }
    
    const nextX = car.x + Math.cos(car.angle) * car.speed * dt;
    const nextY = car.y + Math.sin(car.angle) * car.speed * dt;
    if (this.onTrack(nextX, nextY)) { 
      car.x = nextX; car.y = nextY; 
    } else { 
      car.speed *= -0.7; 
      if (!isDestroyed && car.invuln <= 0) {
        car.health -= 5;
        car.invuln = 0.5;
      }
    }
    
    car.health = Math.max(0, car.health);
    car.tireWear -= Math.abs(car.speed) * 0.000002;
    car.tireWear = Math.max(0, car.tireWear);

    this.checkWaypoint(car);
  }

  private onTrack(x: number, y: number): boolean {
    const t = this.tracks[this.currentTrackIndex];
    for (let i=0; i<t.waypoints.length; i++) {
        if (this.distToSeg({x,y}, t.waypoints[i], t.waypoints[(i+1)%t.waypoints.length]) < this.trackWidth/2 - 5) return true;
    }
    return false;
  }

  private updateAI(car: any, dt: number) {
    if (car.invuln > 0) car.invuln -= dt;
    
    const track = this.tracks[this.currentTrackIndex];
    let target = track.waypoints[car.targetWP];
    let dx = target.x - car.x, dy = target.y - car.y;
    
    this.checkWaypoint(car);

    // AI Driving Line interpolation
    car.angle += (Math.atan2(dy, dx) - car.angle) * 4 * dt;
    
    const maxSpeed = 530; // Boosted AI
    if (car.speed < maxSpeed) {
      car.speed += 800 * dt;
    }
    
    car.x += Math.cos(car.angle)*car.speed*dt;
    car.y += Math.sin(car.angle)*car.speed*dt;
  }

  private checkCollisions(dt: number) {
    this.aiCars.forEach(ai => {
      const dx = this.player.x - ai.x, dy = this.player.y - ai.y;
      if (Math.sqrt(dx*dx+dy*dy) < 55) {  // collision box adjusted for larger cars
        if (this.player.invuln <= 0) {
            this.player.health -= 5; 
            this.player.invuln = 0.5;
        }
        const pushAngle = Math.atan2(dy, dx);
        this.player.x += Math.cos(pushAngle) * 6;
        this.player.y += Math.sin(pushAngle) * 6;
        ai.x -= Math.cos(pushAngle) * 6;
        ai.y -= Math.sin(pushAngle) * 6;
        this.player.speed *= 0.8; 
        ai.speed *= 0.8; 
      }
    });
  }

  private render3D() {
    if(!this.renderer) return;

    // Player Mesh
    const pMesh = this.carMeshes[0];
    if(pMesh) {
      pMesh.position.set(this.player.x, 2, this.player.y);
      pMesh.rotation.y = -this.player.angle;
    }

    // AI Meshes
    this.aiCars.forEach(ai => {
      const m = this.carMeshes[ai.id];
      if(m) {
        m.position.set(ai.x, 2, ai.y);
        m.rotation.y = -ai.angle;
      }
    });

    // Dynamic Follow Camera (Tweaked for higher speed)
    const camDist = 200;
    const camHeight = 90;
    const targetX = this.player.x - Math.cos(this.player.angle) * camDist;
    const targetZ = this.player.y - Math.sin(this.player.angle) * camDist;
    
    // Smooth camera tracking array
    this.camera.position.x += (targetX - this.camera.position.x) * 0.12;
    this.camera.position.z += (targetZ - this.camera.position.z) * 0.12;
    this.camera.position.y += (camHeight - this.camera.position.y) * 0.1;

    // Look slightly ahead of car
    const lookX = this.player.x + Math.cos(this.player.angle) * 100;
    const lookZ = this.player.y + Math.sin(this.player.angle) * 100;
    this.camera.lookAt(lookX, 0, lookZ);

    this.renderer.render(this.scene, this.camera);
  }

  private distToSeg(p: any, v: any, w: any) {
    const l2 = (v.x-w.x)**2 + (v.y-w.y)**2; if(l2===0) return Math.sqrt((p.x-v.x)**2+(p.y-v.y)**2);
    let t = ((p.x-v.x)*(w.x-v.x)+(p.y-v.y)*(w.y-v.y))/l2; t=Math.max(0,Math.min(1,t));
    return Math.sqrt((p.x-(v.x+t*(w.x-v.x)))**2+(p.y-(v.y+t*(w.y-v.y)))**2);
  }
}
