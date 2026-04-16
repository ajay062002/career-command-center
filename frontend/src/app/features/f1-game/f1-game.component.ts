import { Component, ElementRef, HostListener, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import * as THREE from 'three';

/* ═══════════════════════════════════════════════════════
   LEGO F1 GP (3D WebGL Engine)
   Physics-based racing with Lego block aesthetic
   ═══════════════════════════════════════════════════════ */

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
  trackWidth = 160;
  
  tracks = [
    { name: 'Silverstone GP', waypoints: [{x:150, y:150}, {x:1200, y:150}, {x:1200, y:600}, {x:150, y:600}, {x:150, y:150}], color: '#00d2ff' },
    { name: 'Monaco Night', waypoints: [{x:200, y:200}, {x:600, y:120}, {x:1100, y:250}, {x:1000, y:550}, {x:500, y:630}, {x:150, y:450}, {x:200, y:200}], color: '#ff003c' }
  ];
  currentTrackIndex = 0;

  teams = [
    { name: 'Red Bull', c1: 0x0600ef, c2: 0xfcd700 },
    { name: 'Mercedes', c1: 0x00d2be, c2: 0xffffff },
    { name: 'Ferrari', c1: 0xdc0000, c2: 0xffffff }
  ];

  player: any = { health: 100, tireWear: 1.0, lap: 5, speed: 0 };
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
    this.scene.background = new THREE.Color(0x3B82F6); // bright sky blue
    this.scene.fog = new THREE.Fog(0x3B82F6, 400, 1500);

    this.camera = new THREE.PerspectiveCamera(55, 1400 / 750, 1, 3000);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(500, 1000, 500);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 2000;
    dirLight.shadow.camera.bottom = -2000;
    dirLight.shadow.camera.left = -2000;
    dirLight.shadow.camera.right = 2000;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 3000;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    this.scene.add(dirLight);
  }

  private buildScene() {
    // Clear existing meshes to prevent WebGL memory leaks on track change
    while(this.scene.children.length > 2) { 
      const obj = this.scene.children[2] as any;
      
      // Traverse group meshes and release geometry/material from GPU
      if (obj.traverse) {
        obj.traverse((child: any) => {
          if (child.geometry) {
            child.geometry.dispose();
          }
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((m: any) => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      }
      
      this.scene.remove(obj); 
    }

    // Lego Floor Baseplate
    const groundGeo = new THREE.BoxGeometry(4000, 10, 4000);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x1DA15C, roughness: 0.9, metalness: 0 }); // Lego Green
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.set(700, -5, 375);
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Track
    const track = this.tracks[this.currentTrackIndex];
    const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 });
    const kerbRed = new THREE.MeshStandardMaterial({ color: 0xD01012, roughness: 0.5 }); // Lego Red
    const kerbWhite = new THREE.MeshStandardMaterial({ color: 0xF4F4F4, roughness: 0.5 }); // Lego White

    for(let i=0; i<track.waypoints.length; i++) {
        const p1 = track.waypoints[i];
        const p2 = track.waypoints[(i+1)%track.waypoints.length];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const angle = Math.atan2(dy, dx);
        
        const road = new THREE.Group();
        
        // Asphalt
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

    // Cars
    this.carMeshes = {};
    const pMesh = this.createLegoCar(this.teams[0].c1, this.teams[0].c2);
    this.scene.add(pMesh);
    this.carMeshes[0] = pMesh;

    this.aiCars.forEach((ai, i) => {
        const m = this.createLegoCar(ai.c1, ai.c2);
        this.scene.add(m);
        this.carMeshes[ai.id] = m;
    });
  }

  private createLegoCar(c1: number, c2: number): THREE.Group {
    const car = new THREE.Group();
    // Shiny plastic lego bits
    const mat1 = new THREE.MeshStandardMaterial({ color: c1, roughness: 0.15, metalness: 0.1 });
    const mat2 = new THREE.MeshStandardMaterial({ color: c2, roughness: 0.15, metalness: 0.1 });
    const black = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });

    const addBlock = (w:number, h:number, d:number, mat:any, x:number, y:number, z:number) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = true; mesh.receiveShadow = true;
      car.add(mesh);
    };

    // Stud Generator (little cylinders on top of blocks)
    const addStuds = (w:number, d:number, mat:any, xBase:number, yBase:number, zBase:number) => {
      const studGeom = new THREE.CylinderGeometry(1.5, 1.5, 1.5, 8);
      const cols = Math.floor(w/6);
      const rows = Math.floor(d/6);
      for(let i=0; i<cols; i++) {
        for(let j=0; j<rows; j++) {
          const stud = new THREE.Mesh(studGeom, mat);
          stud.position.set(xBase - w/2 + 3 + i*6, yBase, zBase - d/2 + 3 + j*6);
          stud.castShadow = true;
          car.add(stud);
        }
      }
    };

    // Main Chassis
    addBlock(36, 6, 12, mat1, 0, 5, 0);       
    addBlock(12, 6, 8, mat2, 24, 5, 0);     // Nose
    addBlock(8, 2, 24, mat1, 30, 3, 0);     // Front Wing
    addStuds(8, 24, mat1, 30, 4.5, 0);
    
    addBlock(14, 2, 28, mat1, -15, 14, 0);  // Rear wing
    addStuds(14, 28, mat1, -15, 15.5, 0);

    addBlock(4, 9, 8, black, -15, 9, 0);    // Rear support
    addBlock(12, 8, 12, mat2, -2, 12, 0);   // Cockpit

    // Wheels
    const tireGeom = new THREE.CylinderGeometry(6, 6, 6, 16);
    tireGeom.rotateX(Math.PI / 2);
    const wheelsPos = [
      { x: 20, z: 12 }, { x: 20, z: -12 },
      { x: -12, z: 12 }, { x: -12, z: -12 }
    ];
    wheelsPos.forEach(p => {
      const w = new THREE.Mesh(tireGeom, black);
      w.position.set(p.x, 6, p.z);
      w.castShadow = true; w.receiveShadow = true;
      car.add(w);
    });

    car.scale.set(0.9, 0.9, 0.9);
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
    
    // F1 Grid Position Layout
    const sx = track.waypoints[0].x;
    const sy = track.waypoints[0].y;
    
    this.player = {
      id: 0, x: sx + 40, y: sy - 20, angle: 0, speed: 0, lap: 0,
      steeringAngle: 0, tireWear: 1.0, health: 100, targetWP: 1, invuln: 0
    };
    
    this.aiCars = this.teams.slice(1).map((team, i) => ({
      id: i + 1, x: sx - (i * 60) - 20, y: sy + (i % 2 === 0 ? 40 : -40), 
      angle: 0, speed: 0, lap: 0, targetWP: 1, c1: team.c1, c2: team.c2, health: 100, invuln: 0
    }));
    
    this.gamePhase = 'start';
    this.countdown = 3;
    this.lastTime = performance.now();
  }

  onTrackChange(event: any) { this.currentTrackIndex = +event.target.value; this.resetGame(); }

  private keys: { [key: string]: boolean } = {};

  @HostListener('window:keydown', ['$event']) 
  onKeyDown(e: KeyboardEvent) { 
    this.keys[e.key] = true; 
    this.keys[e.key.toLowerCase()] = true; // Handle caps lock
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault(); // Stop window scrolling
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
      if (Math.sqrt(dx*dx + dy*dy) < 180) {
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
    const accel = isDestroyed ? 0 : 600;
    const friction = 0.98;
    const turn = isDestroyed ? 0 : 3.5;

    if (input.ArrowUp || input.w) car.speed += accel * dt;
    if (input.ArrowDown || input.s) car.speed -= accel * dt * 0.7;
    car.speed *= friction;
    
    if (isDestroyed) car.speed *= 0.9;

    if (Math.abs(car.speed) > 10) {
      if (input.ArrowLeft || input.a) car.angle -= turn * dt * (car.speed / 400);
      if (input.ArrowRight || input.d) car.angle += turn * dt * (car.speed / 400);
    }
    
    const nextX = car.x + Math.cos(car.angle) * car.speed * dt;
    const nextY = car.y + Math.sin(car.angle) * car.speed * dt;
    if (this.onTrack(nextX, nextY)) { 
      car.x = nextX; car.y = nextY; 
    } else { 
      car.speed *= -0.8; 
      if (!isDestroyed && car.invuln <= 0) {
        car.health -= 5;
        car.invuln = 0.5;
      }
    }
    
    car.health = Math.max(0, car.health);
    car.tireWear -= Math.abs(car.speed) * 0.000005;
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
    const target = track.waypoints[car.targetWP];
    const dx = target.x - car.x, dy = target.y - car.y;
    
    this.checkWaypoint(car);
    
    car.angle += (Math.atan2(dy, dx) - car.angle) * 3 * dt;
    
    // Smooth AI acceleration instead of instant bulldozer 340 speed
    const maxSpeed = 340;
    if (car.speed < maxSpeed) {
      car.speed += 400 * dt;
    }
    
    car.x += Math.cos(car.angle)*car.speed*dt;
    car.y += Math.sin(car.angle)*car.speed*dt;
  }

  private checkCollisions(dt: number) {
    this.aiCars.forEach(ai => {
      const dx = this.player.x - ai.x, dy = this.player.y - ai.y;
      if (Math.sqrt(dx*dx+dy*dy) < 45) { 
        if (this.player.invuln <= 0) {
            this.player.health -= 5; 
            this.player.invuln = 0.5;
        }
        
        // Push apart
        const pushAngle = Math.atan2(dy, dx);
        this.player.x += Math.cos(pushAngle) * 5;
        this.player.y += Math.sin(pushAngle) * 5;
        ai.x -= Math.cos(pushAngle) * 5;
        ai.y -= Math.sin(pushAngle) * 5;

        // Dampen speeds
        this.player.speed *= 0.8; 
        ai.speed *= 0.8; 
      }
    });
  }

  private render3D() {
    if(!this.renderer) return;

    // Sync models
    const pMesh = this.carMeshes[0];
    if(pMesh) {
      pMesh.position.set(this.player.x, 2, this.player.y);
      pMesh.rotation.y = -this.player.angle;
    }

    this.aiCars.forEach(ai => {
      const m = this.carMeshes[ai.id];
      if(m) {
        m.position.set(ai.x, 2, ai.y);
        m.rotation.y = -ai.angle;
      }
    });

    // Dynamic Follow Camera
    const camDist = 180;
    const camHeight = 80;
    const targetX = this.player.x - Math.cos(this.player.angle) * camDist;
    const targetZ = this.player.y - Math.sin(this.player.angle) * camDist;
    
    this.camera.position.x += (targetX - this.camera.position.x) * 0.1;
    this.camera.position.z += (targetZ - this.camera.position.z) * 0.1;
    this.camera.position.y += (camHeight - this.camera.position.y) * 0.1;

    this.camera.lookAt(this.player.x, 0, this.player.y);

    this.renderer.render(this.scene, this.camera);
  }

  private distToSeg(p: any, v: any, w: any) {
    const l2 = (v.x-w.x)**2 + (v.y-w.y)**2; if(l2===0) return Math.sqrt((p.x-v.x)**2+(p.y-v.y)**2);
    let t = ((p.x-v.x)*(w.x-v.x)+(p.y-v.y)*(w.y-v.y))/l2; t=Math.max(0,Math.min(1,t));
    return Math.sqrt((p.x-(v.x+t*(w.x-v.x)))**2+(p.y-(v.y+t*(w.y-v.y)))**2);
  }
}
