import { Component, ElementRef, HostListener, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-f1-racing',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="racing-container">
      <div class="game-header">
        <div class="header-info">
          <h1>Interlagos Stadium - Grand Prix</h1>
          <p>W/A/S/D to drive | SPACE for DRS | P for Pit Stop</p>
        </div>
        <div class="header-actions">
          <button mat-mini-fab color="warn" (click)="resetGame()" matTooltip="Restart Race">
            <mat-icon>restart_alt</mat-icon>
          </button>
        </div>
      </div>

      <div class="canvas-wrapper" #container>
        <canvas #gameCanvas width="1200" height="700"></canvas>
        
        <!-- HUD Overlays (Glassmorphic) -->
        <div class="hud speed-hud">
          <span class="label">SPEED</span>
          <span class="value">{{ Math.round(player?.speed || 0) }}<span>km/h</span></span>
        </div>

        <div class="hud lap-hud">
          <div class="lap-row">
            <span class="label">LAP</span>
            <span class="value">{{ player?.lap || 0 }}/{{ totalLaps }}</span>
          </div>
          <div class="pos-row">
            <span class="label">POS</span>
            <span class="value">{{ playerPos }}/{{ aiCars.length + 1 }}</span>
          </div>
        </div>

        <div class="hud tire-hud" [class.low-grip]="(player?.tireWear || 0) < 0.4">
          <mat-icon>settings_input_component</mat-icon>
          <div class="tire-info">
            <span class="label">TYRES</span>
            <div class="tire-bar">
              <div class="tire-fill" [style.width.%]="(player?.tireWear || 0) * 100"></div>
            </div>
          </div>
        </div>

        <!-- Start/Finish Message -->
        <div class="overlay-msg" *ngIf="gamePhase === 'start'">
          <div class="countdown" [class.go]="countdown <= 0">
            {{ countdown > 0 ? Math.ceil(countdown) : 'GO!' }}
          </div>
        </div>

        <div class="overlay-msg finish-msg" *ngIf="gamePhase === 'results'">
          <div class="results-card">
            <h2>RACE FINISHED</h2>
            <div class="winner">YOU FINISHED POS #{{ playerPos }}</div>
            <button mat-raised-button color="accent" (click)="resetGame()">RACE AGAIN</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .racing-container {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .game-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      h1 { margin: 0; color: #fff; font-size: 1.5rem; letter-spacing: 1px; }
      p { margin: 0; color: rgba(255,255,255,0.4); font-size: 0.85rem; }
    }
    .canvas-wrapper {
      position: relative;
      background: #000;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 20px 50px rgba(0,0,0,0.5);
      border: 1px solid rgba(255,255,255,0.05);
      canvas { display: block; max-width: 100%; height: auto; }
    }
    .hud {
      position: absolute;
      background: rgba(0,0,0,0.4);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.1);
      padding: 12px 20px;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      pointer-events: none;
      .label { font-size: 0.7rem; font-weight: 800; color: rgba(255,255,255,0.4); letter-spacing: 1px; }
      .value { font-family: 'Orbitron', sans-serif; font-weight: 700; color: #fff; }
    }
    .speed-hud {
      bottom: 20px;
      left: 20px;
      .value { font-size: 2rem; span { font-size: 0.8rem; margin-left: 5px; color: rgba(255,255,255,0.5); } }
    }
    .lap-hud {
      top: 20px;
      right: 20px;
      gap: 5px;
      .lap-row, .pos-row { display: flex; align-items: baseline; gap: 10px; }
      .value { font-size: 1.2rem; }
    }
    .tire-hud {
      bottom: 20px;
      right: 20px;
      flex-direction: row;
      align-items: center;
      gap: 15px;
      transition: all 0.3s ease;
      mat-icon { color: rgba(255,255,255,0.5); }
      &.low-grip { background: rgba(244, 67, 54, 0.2); border-color: rgba(244, 67, 54, 0.4); }
      .tire-info { flex: 1; min-width: 80px; }
      .tire-bar { height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; margin-top: 5px; overflow: hidden; }
      .tire-fill { height: 100%; background: #4caf50; transition: width 0.3s; }
    }
    .overlay-msg {
      position: absolute;
      inset: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      background: rgba(0,0,0,0.6);
      z-index: 100;
    }
    .countdown {
      font-size: 150px;
      font-weight: 900;
      color: #ff5252;
      text-shadow: 0 0 30px rgba(255,82,82,0.5);
      &.go { color: #69f0ae; text-shadow: 0 0 30px rgba(105,240,174,0.5); }
    }
    .results-card {
      background: rgba(20,20,20,0.95);
      padding: 40px;
      border-radius: 24px;
      border: 1px solid #accent;
      text-align: center;
      h2 { color: #ffeb3b; font-size: 2.5rem; margin-bottom: 10px; }
      .winner { font-size: 1.2rem; color: #fff; margin-bottom: 30px; }
    }
  `]
})
export class F1RacingComponent implements OnInit, OnDestroy {
  @ViewChild('gameCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  
  // Game Configuration
  totalLaps = 3;
  trackWidth = 140;
  Math = Math;

  // Track State
  waypoints = [
    {x: 250, y: 150}, {x: 550, y: 100}, {x: 850, y: 120}, {x: 1050, y: 250},
    {x: 1100, y: 450}, {x: 950, y: 600}, {x: 650, y: 620}, {x: 350, y: 600},
    {x: 100, y: 500}, {x: 80, y: 300}, {x: 150, y: 180}, {x: 220, y: 150},
    {x: 250, y: 150}
  ];

  // Game Logic State
  player: any = {};
  aiCars: any[] = [];
  gamePhase: 'start' | 'racing' | 'results' = 'start';
  countdown = 3;
  playerPos = 1;
  lastTime = 0;
  animationFrameId = 0;

  // Input state
  private keys: { [key: string]: boolean } = {};

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) { this.keys[event.key.toLowerCase()] = true; }

  @HostListener('window:keyup', ['$event'])
  handleKeyUp(event: KeyboardEvent) { this.keys[event.key.toLowerCase()] = false; }

  ngOnInit(): void {
    this.resetGame();
    this.animationFrameId = requestAnimationFrame((time) => this.gameLoop(time));
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationFrameId);
  }

  resetGame() {
    this.player = {
      id: 0, x: 250, y: 150, angle: 0, speed: 0, lap: 0,
      tireWear: 1.0, isPitting: false, drsActive: false,
      lastX: 250, lastY: 150, radius: 15
    };

    this.aiCars = [
      { id: 1, x: 200, y: 180, angle: 0, speed: 0, lap: 0, tireWear: 1.0, targetWP: 1, color: '#ff1744' },
      { id: 2, x: 300, y: 180, angle: 0, speed: 0, lap: 0, tireWear: 1.0, targetWP: 1, color: '#2979ff' },
      { id: 3, x: 200, y: 120, angle: 0, speed: 0, lap: 0, tireWear: 1.0, targetWP: 1, color: '#00e676' }
    ];

    this.gamePhase = 'start';
    this.countdown = 3;
    this.lastTime = performance.now();
  }

  private gameLoop(time: number) {
    const dt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    const ctx = this.canvasRef.nativeElement.getContext('2d');
    if (ctx) {
      if (this.gamePhase === 'start') {
        this.countdown -= dt;
        if (this.countdown <= -1) this.gamePhase = 'racing';
        this.drawTrack(ctx);
        this.drawAllCars(ctx);
      } else if (this.gamePhase === 'racing') {
        this.updatePhysics(dt);
        this.drawTrack(ctx);
        this.drawAllCars(ctx);
        this.checkResults();
      } else {
        this.drawTrack(ctx);
        this.drawAllCars(ctx);
      }
    }

    this.animationFrameId = requestAnimationFrame((time) => this.gameLoop(time));
  }

  private updatePhysics(dt: number) {
    // Player Input
    const input = {
      throttle: this.keys['w'] || this.keys['arrowup'],
      brake: this.keys['s'] || this.keys['arrowdown'],
      left: this.keys['a'] || this.keys['arrowleft'],
      right: this.keys['d'] || this.keys['arrowright'],
      drs: this.keys[' ']
    };

    this.processCarPhysics(this.player, input, dt, true);
    this.aiCars.forEach(ai => this.processAI(ai, dt));
    
    // Sort for leaderboard
    const all = [this.player, ...this.aiCars].sort((a,b) => {
      if (a.lap !== b.lap) return b.lap - a.lap;
      const distA = this.distAlongPath(a);
      const distB = this.distAlongPath(b);
      return distB - distA;
    });
    this.playerPos = all.findIndex(c => c.id === 0) + 1;
  }

  private processCarPhysics(car: any, input: any, dt: number, isPlayer: boolean) {
    const maxSpeed = isPlayer ? 450 : 380;
    const accel = 600;
    const steering = 3.5;

    if (input.throttle) car.speed += accel * dt;
    if (input.brake) car.speed -= accel * 2 * dt;
    car.speed *= 0.98; // Friction

    if (car.speed > 10) {
      const rot = (car.speed / maxSpeed) * steering * dt;
      if (input.left) car.angle -= rot;
      if (input.right) car.angle += rot;
    }

    car.speed = Math.max(0, Math.min(car.speed, maxSpeed));
    
    car.lastX = car.x;
    car.lastY = car.y;
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;

    // --- BOUNCE PHYSICS ---
    const distFromTrack = this.getDistToTrack(car.x, car.y);
    if (distFromTrack > this.trackWidth / 2) {
      // Find normal of the collision
      const nearest = this.getNearestPointOnTrack(car.x, car.y);
      const dx = car.x - nearest.x;
      const dy = car.y - nearest.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      // Reflect angle
      const normal = Math.atan2(dy, dx);
      car.angle = normal + (normal - car.angle);
      
      // Hit Back! (Push car back inside)
      car.x = nearest.x + (dx / dist) * (this.trackWidth / 2 - 2);
      car.y = nearest.y + (dy / dist) * (this.trackWidth / 2 - 2);
      
      // Maintain some speed (Bounce effect)
      car.speed *= 0.7;
    }

    // Lap tracking
    if (car.lastX < 250 && car.x >= 250 && car.y < 250) car.lap++;
  }

  private processAI(car: any, dt: number) {
    const target = this.waypoints[car.targetWP];
    const dx = target.x - car.x;
    const dy = target.y - car.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < 100) car.targetWP = (car.targetWP + 1) % this.waypoints.length;

    const targetAngle = Math.atan2(dy, dx);
    let diff = targetAngle - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    const input = {
      throttle: true,
      brake: Math.abs(diff) > 0.5,
      left: diff < -0.1,
      right: diff > 0.1
    };
    this.processCarPhysics(car, input, dt, false);
  }

  private checkResults() {
    if (this.player.lap >= this.totalLaps) this.gamePhase = 'results';
  }

  // --- DRAWING ENGINE ---
  private drawTrack(ctx: CanvasRenderingContext2D) {
    // Grass
    ctx.fillStyle = '#1b5e20';
    ctx.fillRect(0, 0, 1200, 700);

    // --- DRAW STADIUM ---
    this.drawStadium(ctx);

    // Asphalt
    ctx.strokeStyle = '#333';
    ctx.lineWidth = this.trackWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(this.waypoints[0].x, this.waypoints[0].y);
    this.waypoints.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.stroke();

    // Curbs (Red and White)
    ctx.setLineDash([20, 20]);
    ctx.strokeStyle = '#f44336';
    ctx.lineWidth = this.trackWidth + 10;
    ctx.stroke();
    ctx.setLineDash([]);

    // Finish Line
    ctx.fillStyle = '#fff';
    ctx.fillRect(240, 150 - this.trackWidth/2, 20, this.trackWidth);
  }

  private drawStadium(ctx: CanvasRenderingContext2D) {
    // Grandstands
    ctx.fillStyle = '#455a64';
    // Top Grandstand
    ctx.fillRect(400, 20, 400, 40);
    // Bottom Grandstand
    ctx.fillRect(400, 640, 400, 40);
    
    // Spectators (Small colorful dots)
    ctx.fillStyle = '#fff';
    for(let i=0; i<400; i+=10) {
      ctx.fillStyle = ['#ff5252','#448aff','#ffd740'][Math.floor(Math.random()*3)];
      ctx.beginPath();
      ctx.arc(400+i, 30, 2, 0, Math.PI*2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(400+i, 660, 2, 0, Math.PI*2);
      ctx.fill();
    }

    // Floodlights
    ctx.fillStyle = '#90a4ae';
    [ [100,100], [1100,100], [100,600], [1100,600] ].forEach(p => {
      ctx.fillRect(p[0]-5, p[1]-5, 10, 10);
      const grad = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], 100);
      grad.addColorStop(0, 'rgba(255,255,255,0.1)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p[0], p[1], 150, 0, Math.PI*2);
      ctx.fill();
    });
  }

  private drawAllCars(ctx: CanvasRenderingContext2D) {
    this.drawDetailedCar(ctx, this.player, '#ffea00');
    this.aiCars.forEach(ai => this.drawDetailedCar(ctx, ai, ai.color));
  }

  private drawDetailedCar(ctx: CanvasRenderingContext2D, car: any, color: string) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);

    // Front Wing
    ctx.fillStyle = '#222';
    ctx.fillRect(15, -12, 5, 24);

    // Rear Wing
    ctx.fillRect(-20, -12, 4, 24);

    // Main Body (Tapered)
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-15, -8);
    ctx.lineTo(15, -4);
    ctx.lineTo(15, 4);
    ctx.lineTo(-15, 8);
    ctx.closePath();
    ctx.fill();

    // Halo / Cockpit
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI*2);
    ctx.fill();
    
    // Wheels
    ctx.fillStyle = '#111';
    [ [10,-14], [10,10], [-15,-14], [-15,10] ].forEach(w => {
      ctx.fillRect(w[0], w[1], 8, 4);
    });

    ctx.restore();
  }

  // --- MATH UTILS ---
  private getDistToTrack(x: number, y: number) {
    let minD = 10000;
    for (let i=0; i<this.waypoints.length-1; i++) {
       const d = this.distToSegment(x, y, this.waypoints[i], this.waypoints[i+1]);
       if (d < minD) minD = d;
    }
    return minD;
  }

  private getNearestPointOnTrack(x: number, y: number) {
    let minD = 10000;
    let nearest = {x:0, y:0};
    for (let i=0; i<this.waypoints.length-1; i++) {
       const p = this.getClosestPointOnSegment(x, y, this.waypoints[i], this.waypoints[i+1]);
       const d = Math.sqrt((x-p.x)**2 + (y-p.y)**2);
       if (d < minD) { minD = d; nearest = p; }
    }
    return nearest;
  }

  private distToSegment(x: number, y: number, p1: any, p2: any) {
    const p = this.getClosestPointOnSegment(x, y, p1, p2);
    return Math.sqrt((x-p.x)**2 + (y-p.y)**2);
  }

  private getClosestPointOnSegment(x: number, y: number, p1: any, p2: any) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const t = ((x-p1.x)*dx + (y-p1.y)*dy) / (dx*dx + dy*dy);
    const ct = Math.max(0, Math.min(1, t));
    return { x: p1.x + ct*dx, y: p1.y + ct*dy };
  }

  private distAlongPath(car: any) {
     // Simplified lap progress based on current waypoint
     const wp = car.targetWP || 0;
     return wp * 1000 + (1000 - this.getDistToTrack(car.x, car.y));
  }
}
