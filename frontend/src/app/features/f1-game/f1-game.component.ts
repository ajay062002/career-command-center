import { Component, ElementRef, HostListener, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import * as THREE from 'three';

/* ═══════════════════════════════════════════════════════
   LEGO F1 GP (Grand Prix Edition)
   Smarter AI, Larger Tracks, Pit Stops, and No Holes.
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
  trackWidth = 280; // WIDER TRACK
  trackScale = 1.6; // LONGER TRACKS
  
  rawTracks: F1Track[] = [
    { name: 'Silverstone GP', biome: 'grassland', waypoints: [{x:150, y:150}, {x:2000, y:150}, {x:2000, y:1000}, {x:150, y:1000}, {x:150, y:150}] },
    { name: 'Monaco GP', biome: 'night', waypoints: [{x:200, y:200}, {x:800, y:120}, {x:1400, y:250}, {x:1300, y:550}, {x:500, y:730}, {x:150, y:450}, {x:200, y:200}] },
    { name: 'Monza', biome: 'grassland', waypoints: [{x:100, y:100}, {x:2800, y:100}, {x:2900, y:500}, {x:2800, y:900}, {x:100, y:900}, {x:100, y:100}] },
    { name: 'Bahrain GP', biome: 'desert', waypoints: [{x:300, y:100}, {x:1800, y:100}, {x:2000, y:500}, {x:1000, y:900}, {x:200, y:600}, {x:300, y:100}] },
    { name: 'Spa-Francorchamps', biome: 'grassland', waypoints: [{x:150, y:150}, {x:800, y:50}, {x:1500, y:50}, {x:2500, y:400}, {x:2200, y:1200}, {x:1000, y:1400}, {x:300, y:800}, {x:150, y:150}] },
    { name: 'Interlagos', biome: 'grassland', waypoints: [{x:150, y:100}, {x:1000, y:50}, {x:1200, y:500}, {x:600, y:600}, {x:1000, y:1000}, {x:150, y:900}, {x:150, y:100}] }
  ];
  
  tracks: F1Track[] = [];
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
  
  selectedTeamId = 0;

  biomes: any = {
    grassland: { ground: 0x1DA15C, sky: 0x3B82F6, ambient: 0xffffff, dIntensity: 1.0 },
    night: { ground: 0x111111, sky: 0x020205, ambient: 0xffffff, dIntensity: 0.25 },
    desert: { ground: 0xD2B48C, sky: 0xFFA07A, ambient: 0xffeebb, dIntensity: 0.9 }
  };

  player: any = { health: 100, tireWear: 100, lap: 0, speed: 0, pitting: false };
  aiCars: any[] = [];
  gamePhase: 'start' | 'racing' | 'finished' = 'start';
  countdown = 3;
  lastTime = 0;

  constructor() { 
    this.scaleTracks();
    this.resetGameLogic(); 
  }

  private scaleTracks() {
    this.tracks = this.rawTracks.map(t => ({
      ...t,
      waypoints: t.waypoints.map(w => ({ x: w.x * this.trackScale, y: w.y * this.trackScale }))
    }));
  }

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

  private init3D() {
    const canvas = this.canvasRef.nativeElement;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(1400, 750);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1400 / 750, 1, 6000);
  }

  private buildScene() {
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
    this.scene.fog = new THREE.Fog(biome.sky, 800, 3000);

    const ambientLight = new THREE.AmbientLight(biome.ambient, 0.4);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, biome.dIntensity);
    dirLight.position.set(500, 1200, 500);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 4000;
    dirLight.shadow.camera.bottom = -4000;
    dirLight.shadow.camera.left = -4000;
    dirLight.shadow.camera.right = 4000;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    this.scene.add(dirLight);

    // Ground
    const groundGeo = new THREE.BoxGeometry(10000, 10, 10000);
    const groundMat = new THREE.MeshStandardMaterial({ color: biome.ground, roughness: 0.95 }); 
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.set(1500, -5, 1000);
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Track Assembly
    const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x242424, roughness: 0.9 });
    const kerbRed = new THREE.MeshStandardMaterial({ color: 0xD01012, roughness: 0.5 }); 
    const kerbWhite = new THREE.MeshStandardMaterial({ color: 0xFDFDFD, roughness: 0.5 }); 

    for(let i=0; i<track.waypoints.length; i++) {
        const p1 = track.waypoints[i];
        const p2 = track.waypoints[(i+1)%track.waypoints.length];
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const dist = Math.sqrt(dx*dx + dy*dy), angle = Math.atan2(dy, dx);
        
        const road = new THREE.Group();
        const roadMesh = new THREE.Mesh(new THREE.BoxGeometry(dist + this.trackWidth, 1.5, this.trackWidth), asphaltMat);
        roadMesh.receiveShadow = true;
        road.add(roadMesh);

        // Kerbs
        const numKerbs = Math.floor(dist / 60);
        for(let k=0; k<numKerbs; k++) {
            const mat = k % 2 === 0 ? kerbRed : kerbWhite;
            const k1 = new THREE.Mesh(new THREE.BoxGeometry(60, 3, 20), mat);
            k1.position.set(-dist/2 + k*60 + 30, 0.8, this.trackWidth/2 + 10);
            k1.castShadow = true; road.add(k1);
            const k2 = new THREE.Mesh(new THREE.BoxGeometry(60, 3, 20), mat);
            k2.position.set(-dist/2 + k*60 + 30, 0.8, -this.trackWidth/2 - 10);
            k2.castShadow = true; road.add(k2);
        }

        road.position.set(p1.x + dx/2, 0.8, p1.y + dy/2);
        road.rotation.y = -angle;
        this.scene.add(road);
    }

    // Spawn
    this.carMeshes = {};
    const playerTeam = this.teams.find(t => t.id === this.selectedTeamId) || this.teams[0];
    this.carMeshes[0] = this.createAdvancedLegoCar(playerTeam.c1, playerTeam.c2, playerTeam.c3);
    this.scene.add(this.carMeshes[0]);

    this.aiCars.forEach(ai => {
        const m = this.createAdvancedLegoCar(ai.c1, ai.c2, ai.c3);
        this.scene.add(m);
        this.carMeshes[ai.id] = m;
    });
  }

  private createAdvancedLegoCar(c1: number, c2: number, c3: number): THREE.Group {
    const car = new THREE.Group();
    const mat1 = new THREE.MeshStandardMaterial({ color: c1, roughness: 0.1, metalness: 0.2 });
    const mat2 = new THREE.MeshStandardMaterial({ color: c2, roughness: 0.1, metalness: 0.2 });
    const mat3 = new THREE.MeshStandardMaterial({ color: c3, roughness: 0.1, metalness: 0.2 });
    const black = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });

    const addBlock = (w:number, h:number, d:number, mat:any, x:number, y:number, z:number) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);
      mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; car.add(mesh);
    };

    addBlock(40, 6, 12, mat1, 0, 5, 0); // Chassis
    addBlock(20, 5, 8, mat2, 30, 4.5, 0); // Nose
    addBlock(6, 2, 40, mat1, 40, 3, 0); // Front Wing
    addBlock(18, 6, 8, mat1, 0, 5, 10); // L Pod
    addBlock(18, 6, 8, mat1, 0, 5, -10); // R Pod
    addBlock(16, 8, 8, mat2, -10, 10, 0); // Engine
    addBlock(8, 2, 35, mat1, -22, 16, 0); // Rear Wing
    addBlock(10, 1, 10, black, 10, 14, 0); // Halo
    
    // Wheels
    const tireG = new THREE.CylinderGeometry(7.5, 7.5, 8, 24); tireG.rotateX(Math.PI/2);
    [{x:26,z:16},{x:26,z:-16},{x:-16,z:16},{x:-16,z:-16}].forEach(p => {
        const w = new THREE.Mesh(tireG, black); w.position.set(p.x, 7.5, p.z);
        w.castShadow = true; car.add(w);
    });

    car.scale.set(0.9, 0.9, 0.9);
    return car;
  }

  resetGame() { this.resetGameLogic(); if(this.scene) this.buildScene(); }

  resetGameLogic() {
    const track = this.tracks[this.currentTrackIndex];
    const sx = track.waypoints[0].x, sy = track.waypoints[0].y;
    
    this.player = {
      id: 0, x: sx + 60, y: sy - 40, angle: 0, speed: 0, lap: 0,
      steeringAngle: 0, tireWear: 100, health: 100, targetWP: 1, invuln: 0, pitting: false
    };
    
    const remainingTeams = this.teams.filter(t => t.id !== this.selectedTeamId);
    this.aiCars = remainingTeams.map((team, i) => ({
      id: team.id, x: sx - (i * 90) - 80, y: sy + (i % 2 === 0 ? 60 : -60), 
      angle: 0, speed: 0, lap: 0, targetWP: 1, c1: team.c1, c2: team.c2, c3: team.c3, health: 100, invuln: 0
    }));
    
    this.gamePhase = 'start';
    this.countdown = 3;
    this.lastTime = performance.now();
  }

  onTrackChange(event: any) { this.currentTrackIndex = +event.target.value; this.resetGame(); }
  onTeamChange(event: any) { this.selectedTeamId = +event.target.value; this.resetGame(); }

  private keys: { [key: string]: boolean } = {};
  @HostListener('window:keydown', ['$event']) onKeyDown(e: KeyboardEvent) { this.keys[e.key] = true; this.keys[e.key.toLowerCase()] = true; if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault(); }
  @HostListener('window:keyup', ['$event']) onKeyUp(e: KeyboardEvent) { this.keys[e.key] = false; this.keys[e.key.toLowerCase()] = false; }

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
      if (Math.sqrt(dx*dx + dy*dy) < 300) { // Larger waypoint trigger for larger scale
        car.targetWP = (car.targetWP + 1) % track.waypoints.length;
        if (car.targetWP === 1) {
          car.lap++;
          if (car.id === 0 && car.lap >= this.totalLaps) this.gamePhase = 'finished';
        }
      }
    }
  }

  private updateCar(car: any, input: any, dt: number) {
    if (car.invuln > 0) car.invuln -= dt;

    const track = this.tracks[this.currentTrackIndex];
    const isDestroyed = car.health <= 0;
    
    // --- PIT STOP CHECK ---
    const distToStart = Math.sqrt((car.x - track.waypoints[0].x)**2 + (car.y - track.waypoints[0].y)**2);
    car.pitting = distToStart < 400 && Math.abs(car.speed) < 200;
    
    if (car.pitting) {
        car.health = Math.min(100, car.health + 20 * dt);
        car.tireWear = Math.min(100, car.tireWear + 20 * dt);
        car.speed *= 0.95; // Slow down in pits
    }

    // --- MEGA SPEED BOOST (800+ KM/H) ---
    const accel = isDestroyed ? 0 : 2200; 
    const friction = 0.985;
    const turn = isDestroyed ? 0 : 4.8;

    if (input.ArrowUp || input.w) car.speed += accel * dt;
    if (input.ArrowDown || input.s) car.speed -= accel * dt * 0.8;
    car.speed *= friction;
    
    if (Math.abs(car.speed) > 10) {
      if (input.ArrowLeft || input.a) car.angle -= turn * dt * (car.speed / 1000);
      if (input.ArrowRight || input.d) car.angle += turn * dt * (car.speed / 1000);
    }
    
    const nextX = car.x + Math.cos(car.angle) * car.speed * dt;
    const nextY = car.y + Math.sin(car.angle) * car.speed * dt;
    
    if (this.onTrack(nextX, nextY)) { 
      car.x = nextX; car.y = nextY; 
    } else { 
      // PUSH BACK LOGIC (Prevents holes)
      car.speed *= -0.8; 
      car.x -= Math.cos(car.angle) * 15;
      car.y -= Math.sin(car.angle) * 15;
      if (!isDestroyed && car.invuln <= 0) { car.health -= 8; car.invuln = 0.4; }
    }
    
    car.health = Math.max(0, car.health);
    car.tireWear -= Math.abs(car.speed) * 0.00001;
    car.tireWear = Math.max(0, car.tireWear);

    this.checkWaypoint(car);
  }

  private onTrack(x: number, y: number): boolean {
    const t = this.tracks[this.currentTrackIndex];
    const hw = this.trackWidth / 2;
    // Check Segments
    for (let i=0; i<t.waypoints.length; i++) {
        if (this.distToSeg({x,y}, t.waypoints[i], t.waypoints[(i+1)%t.waypoints.length]) < hw - 10) return true;
    }
    // CHECK WAYPOINTS (PLUGS HOLES AT CORNERS)
    for (const p of t.waypoints) {
        if (Math.sqrt((p.x-x)**2 + (p.y-y)**2) < hw - 10) return true;
    }
    return false;
  }

  private updateAI(car: any, dt: number) {
    if (car.invuln > 0) car.invuln -= dt;
    const track = this.tracks[this.currentTrackIndex];
    const target = track.waypoints[car.targetWP];
    const dx = target.x - car.x, dy = target.y - car.y;
    this.checkWaypoint(car);

    // AI TRACK AWARENESS (Fix for going out of track)
    const onTrack = this.onTrack(car.x, car.y);
    const steeringForce = onTrack ? 5 : 12; // Steer harder if off-track
    const targetAngle = Math.atan2(dy, dx);
    
    car.angle += (targetAngle - car.angle) * steeringForce * dt;
    
    let maxSpeed = onTrack ? 680 : 300; 
    if (car.speed < maxSpeed) car.speed += 900 * dt;
    else if (car.speed > maxSpeed) car.speed *= 0.95;
    
    car.x += Math.cos(car.angle)*car.speed*dt;
    car.y += Math.sin(car.angle)*car.speed*dt;
  }

  private checkCollisions(dt: number) {
    this.aiCars.forEach(ai => {
      const dx = this.player.x - ai.x, dy = this.player.y - ai.y;
      if (Math.sqrt(dx*dx+dy*dy) < 60) { 
        if (this.player.invuln <= 0) { this.player.health -= 10; this.player.invuln = 0.5; }
        const pushA = Math.atan2(dy, dx);
        this.player.x += Math.cos(pushA) * 10; this.player.y += Math.sin(pushA) * 10;
        ai.x -= Math.cos(pushA) * 10; ai.y -= Math.sin(pushA) * 10;
        this.player.speed *= 0.7; ai.speed *= 0.7; 
      }
    });
  }

  private render3D() {
    if(!this.renderer) return;
    const pMesh = this.carMeshes[0];
    if(pMesh) { pMesh.position.set(this.player.x, 2, this.player.y); pMesh.rotation.y = -this.player.angle; }
    this.aiCars.forEach(ai => {
      const m = this.carMeshes[ai.id];
      if(m) { m.position.set(ai.x, 2, ai.y); m.rotation.y = -ai.angle; }
    });
    const cDist = 250, cHeight = 110;
    const tX = this.player.x - Math.cos(this.player.angle) * cDist, tZ = this.player.y - Math.sin(this.player.angle) * cDist;
    this.camera.position.x += (tX - this.camera.position.x) * 0.15;
    this.camera.position.z += (tZ - this.camera.position.z) * 0.15;
    this.camera.position.y += (cHeight - this.camera.position.y) * 0.1;
    this.camera.lookAt(this.player.x + Math.cos(this.player.angle) * 120, 0, this.player.y + Math.sin(this.player.angle) * 120);
    this.renderer.render(this.scene, this.camera);
  }

  private distToSeg(p: any, v: any, w: any) {
    const l2 = (v.x-w.x)**2 + (v.y-w.y)**2; if(l2===0) return Math.sqrt((p.x-v.x)**2+(p.y-v.y)**2);
    let t = ((p.x-v.x)*(w.x-v.x)+(p.y-v.y)*(w.y-v.y))/l2; t=Math.max(0,Math.min(1,t));
    return Math.sqrt((p.x-(v.x+t*(w.x-v.x)))**2+(p.y-(v.y+t*(w.y-v.y)))**2);
  }
}
