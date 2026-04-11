import { Component, ElementRef, HostListener, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-f1-game',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="racing-container">
      <div class="game-header">
        <div class="header-left">
          <h1>SARK Stadium - Night Grand Prix</h1>
          <span class="subtitle">W/A/S/D to Drive • SPACE for DRS</span>
        </div>
        <div class="header-actions">
          <button mat-mini-fab class="reset-fab" (click)="resetGame()" matTooltip="Restart Race">
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
            <div class="trophy-icon"><mat-icon>emoji_events</mat-icon></div>
            <h2>{{ playerPos === 1 ? 'VICTORY!' : 'RACE FINISHED' }}</h2>
            <div class="winner">YOU FINISHED POS #{{ playerPos }}</div>
            <button mat-raised-button class="restart-btn" (click)="resetGame()">RACE AGAIN</button>
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
      max-width: 1300px;
      margin: 0 auto;
    }
    .game-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      .header-left h1 { margin: 0; color: #fff; font-size: 1.8rem; letter-spacing: 1px; font-weight: 800; }
      .subtitle { color: rgba(255,255,255,0.4); font-size: 0.85rem; letter-spacing: 0.5px; }
    }
    .reset-fab { background: rgba(255,255,255,0.05) !important; border: 1px solid rgba(255,255,255,0.1) !important; color: #fff !important; }
    .canvas-wrapper {
      position: relative;
      background: #000;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 20px 80px rgba(0,0,0,0.8);
      border: 1px solid rgba(255,255,255,0.08);
      canvas { display: block; max-width: 100%; height: auto; }
    }
    .hud {
      position: absolute;
      background: rgba(15,15,15,0.6);
      backdrop-filter: blur(15px);
      border: 1px solid rgba(255,255,255,0.1);
      padding: 16px 24px;
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      pointer-events: none;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      .label { font-size: 0.65rem; font-weight: 800; color: #64b5f6; letter-spacing: 2px; }
      .value { font-family: 'Orbitron', monospace; font-weight: 700; color: #fff; }
    }
    .speed-hud {
      bottom: 30px;
      left: 30px;
      .value { font-size: 2.2rem; span { font-size: 0.8rem; margin-left: 8px; color: rgba(255,255,255,0.4); } }
    }
    .lap-hud {
      top: 30px;
      right: 30px;
      gap: 8px;
      .lap-row, .pos-row { display: flex; align-items: baseline; gap: 15px; }
      .value { font-size: 1.4rem; color: #ffeb3b; }
    }
    .tire-hud {
      bottom: 30px;
      right: 30px;
      flex-direction: row;
      align-items: center;
      gap: 15px;
      transition: all 0.3s ease;
      mat-icon { color: #64b5f6; }
      &.low-grip { background: rgba(244, 67, 54, 0.25); border-color: rgba(244, 67, 54, 0.4); mat-icon { color: #f44336; } }
      .tire-info { flex: 1; min-width: 100px; }
      .tire-bar { height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; margin-top: 8px; overflow: hidden; }
      .tire-fill { height: 100%; background: #4caf50; transition: width 0.3s; box-shadow: 0 0 10px rgba(76,175,80,0.5); }
    }
    .overlay-msg {
      position: absolute;
      inset: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      background: rgba(0,0,0,0.7);
      z-index: 100;
      backdrop-filter: blur(5px);
    }
    .countdown {
      font-size: 180px;
      font-weight: 900;
      color: #ff5252;
      animation: zoomIn 0.5s ease-out;
      text-shadow: 0 0 50px rgba(255,82,82,0.6);
      &.go { color: #69f0ae; text-shadow: 0 0 50px rgba(105,240,174,0.6); }
    }
    @keyframes zoomIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    .results-card {
      background: linear-gradient(135deg, rgba(30,30,30,0.95), rgba(10,10,10,0.95));
      padding: 50px 70px;
      border-radius: 32px;
      border: 1px solid rgba(255,255,255,0.1);
      text-align: center;
      box-shadow: 0 30px 60px rgba(0,0,0,0.8);
      .trophy-icon mat-icon { font-size: 80px; width: 80px; height: 80px; color: #ffeb3b; margin-bottom: 20px; }
      h2 { color: #fff; font-size: 3rem; font-weight: 800; margin: 0; }
      .winner { font-size: 1.4rem; color: rgba(255,255,255,0.5); margin: 15px 0 40px; }
      .restart-btn { padding: 0 40px; height: 50px; background: #64b5f6 !important; color: #000 !important; font-weight: 800; border-radius: 25px; }
    }
  `]
})
export class F1GameComponent implements AfterViewInit, OnDestroy {
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

  ngAfterViewInit(): void {
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
      { id: 1, x: 200, y: 180, angle: 0, speed: 0, lap: 0, tireWear: 1.0, targetWP: 1, color: '#f44336' },
      { id: 2, x: 300, y: 180, angle: 0, speed: 0, lap: 0, tireWear: 1.0, targetWP: 1, color: '#2196f3' },
      { id: 3, x: 200, y: 120, angle: 0, speed: 0, lap: 0, tireWear: 1.0, targetWP: 1, color: '#4caf50' }
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
    const maxSpeed = isPlayer ? 400 : 350;
    const accel = isPlayer ? 8 : 6.5;
    const braking = 12;
    const friction = 0.95;
    const steeringAngle = 0.08;

    // Steering
    if (input.left) car.steeringAngle = Math.max(car.steeringAngle - steeringAngle * dt, -0.5);
    if (input.right) car.steeringAngle = Math.min(car.steeringAngle + steeringAngle * dt, 0.5);
    car.steeringAngle *= 0.92; // Return to center

    // Accel/Brake
    if (input.throttle && car.speed < maxSpeed) car.speed += accel * dt * 100;
    if (input.brake) car.speed -= braking * dt * 100;

    car.speed *= friction;
    car.speed = Math.max(0, Math.min(car.speed, maxSpeed));

    car.lastX = car.x;
    car.lastY = car.y;
    car.angle += car.steeringAngle * dt;
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;

    // Wall collision (Simplified bounce like logic from original)
    if (this.getDistToTrack(car.x, car.y) > this.trackWidth / 2) {
        car.x = car.lastX;
        car.y = car.lastY;
        car.speed *= 0.5; // Bounce slow
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
      brake: Math.abs(diff) > 0.4,
      left: diff < -0.05,
      right: diff > 0.05
    };
    this.processCarPhysics(car, input, dt, false);
  }

  private checkResults() {
    if (this.player.lap >= this.totalLaps) this.gamePhase = 'results';
  }

  // --- DRAWING ENGINE ---
  private drawTrack(ctx: CanvasRenderingContext2D) {
    // Darker Night Grass
    ctx.fillStyle = '#102e12';
    ctx.fillRect(0, 0, 1200, 700);

    // --- DRAW STADIUM ---
    this.drawStadium(ctx);

    // Track Border (White)
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = this.trackWidth + 12;
    ctx.beginPath();
    ctx.moveTo(this.waypoints[0].x, this.waypoints[0].y);
    this.waypoints.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.stroke();

    // Asphalt
    ctx.strokeStyle = '#222';
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
    ctx.lineWidth = this.trackWidth + 8;
    ctx.stroke();
    ctx.setLineDash([]);

    // Grid slots & Finish line
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for(let i=0; i<3; i++) {
       ctx.fillRect(180 - i*50, 150 - this.trackWidth/2 + 20 + i*40, 40, 15);
    }
    
    ctx.fillStyle = '#fff';
    // Checker pattern finish line
    for(let y=0; y<this.trackWidth; y+=20) {
      ctx.fillStyle = (y % 40 === 0) ? '#fff' : '#000';
      ctx.fillRect(240, 150 - this.trackWidth/2 + y, 10, 20);
      ctx.fillRect(250, 150 - this.trackWidth/2 + y, 10, 20);
    }
  }

  private drawStadium(ctx: CanvasRenderingContext2D) {
    // Grandstands
    ctx.fillStyle = '#1e1e1e';
    // Top Grandstand with glowing ads
    ctx.fillRect(400, 15, 400, 35);
    ctx.fillStyle = '#64b5f6';
    ctx.fillRect(420, 22, 100, 10); // Ad 1
    ctx.fillStyle = '#ffeb3b';
    ctx.fillRect(550, 22, 100, 10); // Ad 2

    // Bottom Grandstand
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(400, 650, 400, 35);
    
    // Spectators (Glowing night crowd)
    ctx.fillStyle = '#fff';
    for(let i=0; i<400; i+=12) {
      if (Math.random() > 0.3) {
        ctx.fillStyle = ['#ff5252','#448aff','#ffd740','#fff'][Math.floor(Math.random()*4)];
        ctx.beginPath();
        ctx.arc(400+i, 25, 1.5, 0, Math.PI*2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(400+i, 665, 1.5, 0, Math.PI*2);
        ctx.fill();
      }
    }

    // High Floodlights
    [ [80,80], [1120,80], [80,620], [1120,620], [600, 50], [600, 650] ].forEach(p => {
      // Light Post
      ctx.fillStyle = '#333';
      ctx.fillRect(p[0]-3, p[1]-3, 6, 6);
      
      // Light Glow
      const grad = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], 180);
      grad.addColorStop(0, 'rgba(255,255,255,0.12)');
      grad.addColorStop(0.5, 'rgba(100,181,246,0.03)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p[0], p[1], 200, 0, Math.PI*2);
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

    // --- CAR COMPLEX DRAWING ---
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-15, -6, 32, 14);

    // Front Wing (Wider)
    ctx.fillStyle = '#111';
    ctx.fillRect(16, -14, 4, 28);
    // Endplates
    ctx.fillRect(14, -14, 6, 4);
    ctx.fillRect(14, 10, 6, 4);

    // Rear Wing (Higher)
    ctx.fillStyle = '#000';
    ctx.fillRect(-22, -13, 3, 26);

    // Main Body (V-Tapered)
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-18, -9);
    ctx.lineTo(16, -5);
    ctx.lineTo(16, 5);
    ctx.lineTo(-18, 9);
    ctx.closePath();
    ctx.fill();
    
    // Sidepods (Aggressive curve)
    ctx.fillRect(-8, -12, 10, 3);
    ctx.fillRect(-8, 9, 10, 3);

    // Cockpit & Halo
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.ellipse(3, 0, 8, 4, 0, 0, Math.PI*2);
    ctx.fill();
    // Driver Helmet
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI*2);
    ctx.fill();
    
    // Exposed Wheels (Thick Pirelli Slicks)
    ctx.fillStyle = '#111';
    [ [11,-16], [11,12], [-14,-16], [-14,12] ].forEach(w => {
      ctx.fillRect(w[0], w[1], 9, 5);
      // Rim detail
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.strokeRect(w[0]+2, w[1]+1, 5, 3);
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
     const wp = car.targetWP || 0;
     const next = this.waypoints[wp];
     const distToNext = Math.sqrt((car.x-next.x)**2 + (car.y-next.y)**2);
     return wp * 2000 - distToNext;
  }
}
