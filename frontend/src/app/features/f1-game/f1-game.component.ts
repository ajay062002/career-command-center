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
  // Game Configuration
  totalLaps = 3;
  trackWidth = 140;
  Math = Math;

  // Track Database
  tracks = [
    {
      name: 'Interlagos (Speed)',
      waypoints: [{x:250, y:150}, {x:550, y:100}, {x:850, y:120}, {x:1050, y:250}, {x:1100, y:450}, {x:950, y:600}, {x:650, y:620}, {x:350, y:600}, {x:100, y:500}, {x:80, y:300}, {x:150, y:180}, {x:220, y:150}, {x:250, y:150}]
    },
    {
       name: 'Monaco (Tight)',
       waypoints: [{x:100,y:100}, {x:500,y:80}, {x:900,y:150}, {x:1000,y:400}, {x:800,y:600}, {x:400,y:550}, {x:150,y:400}, {x:100,y:100}]
    },
    {
       name: 'Silverstone (Fast)',
       waypoints: [{x:200,y:200}, {x:1000,y:100}, {x:1100,y:500}, {x:600,y:650}, {x:100,y:400}, {x:200,y:200}]
    }
  ];
  currentTrackIndex = 0;

  // Game Logic State
  player: any = {};
  aiCars: any[] = [];
  gamePhase: 'start' | 'racing' | 'results' = 'start';
  countdown = 3;
  playerPos = 1;
  lastTime = 0;
  animationFrameId = 0;
  
  // Teams
  teams = [
    { name: 'Red Bull', color: '#1e3d59' },
    { name: 'Mercedes', color: '#00d2be' },
    { name: 'Ferrari', color: '#ff2800' },
    { name: 'McLaren', color: '#ff8700' },
    { name: 'Aston Martin', color: '#006f62' }
  ];

  private keys: { [key: string]: boolean } = {};

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) { this.keys[event.key.toLowerCase()] = true; }

  @HostListener('window:keyup', ['$event'])
  handleKeyUp(event: KeyboardEvent) { this.keys[event.key.toLowerCase()] = false; }

  ngAfterViewInit(): void {
    this.resetGame();
    this.animationFrameId = requestAnimationFrame((time) => this.gameLoop(time));
  }

  ngOnDestroy(): void { cancelAnimationFrame(this.animationFrameId); }

  resetGame() {
    const track = this.tracks[this.currentTrackIndex];
    this.player = {
      id: 0, x: track.waypoints[0].x, y: track.waypoints[0].y, angle: 0, speed: 0, lap: 0,
      tireWear: 1.0, health: 100, lastX: track.waypoints[0].x, lastY: track.waypoints[0].y
    };

    this.aiCars = this.teams.slice(1).map((team, i) => ({
      id: i + 1, x: track.waypoints[0].x - (i+1)*50, y: track.waypoints[0].y + 20, 
      angle: 0, speed: 0, lap: 0, targetWP: 1, color: team.color, health: 100
    }));

    this.gamePhase = 'start';
    this.countdown = 3;
    this.lastTime = performance.now();
  }

  nextTrack() {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
    this.resetGame();
  }

  private gameLoop(time: number) {
    const dt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;
    const ctx = this.canvasRef.nativeElement.getContext('2d');
    if (ctx) {
      if (this.gamePhase === 'start') {
        this.countdown -= dt;
        if (this.countdown <= -1) this.gamePhase = 'racing';
        this.drawScene(ctx);
      } else if (this.gamePhase === 'racing') {
        this.updatePhysics(dt);
        this.drawScene(ctx);
        if (this.player.lap >= this.totalLaps) this.gamePhase = 'results';
      } else {
        this.drawScene(ctx);
      }
    }
    this.animationFrameId = requestAnimationFrame((time) => this.gameLoop(time));
  }

  private updatePhysics(dt: number) {
    const input = {
      throttle: this.keys['w'] || this.keys['arrowup'],
      brake: this.keys['s'] || this.keys['arrowdown'],
      left: this.keys['a'] || this.keys['arrowleft'],
      right: this.keys['d'] || this.keys['arrowright']
    };
    this.processCarPhysics(this.player, input, dt, true);
    this.aiCars.forEach(ai => this.processAI(ai, dt));

    // Simple Collision Check between cars
    [this.player, ...this.aiCars].forEach(c1 => {
      [this.player, ...this.aiCars].forEach(c2 => {
        if (c1.id !== c2.id) {
           const dx = c2.x - c1.x;
           const dy = c2.y - c1.y;
           const dist = Math.sqrt(dx*dx + dy*dy);
           if (dist < 40) {
              c1.health -= 5 * dt;
              // Bounce Away
              const angle = Math.atan2(dy, dx);
              c1.angle -= 0.1;
              c1.speed *= 0.8;
           }
        }
      });
    });
  }

  private processCarPhysics(car: any, input: any, dt: number, isPlayer: boolean) {
    const maxSpeed = isPlayer ? 450 : 380;
    const accel = isPlayer ? 1000 : 800;
    if (input.throttle) car.speed += accel * dt;
    if (input.brake) car.speed -= accel * 2 * dt;
    car.speed *= 0.98; // Friction

    const steerSpeed = 3.5;
    if (car.speed > 20) {
       if (input.left) car.angle -= steerSpeed * (car.speed / maxSpeed) * dt;
       if (input.right) car.angle += steerSpeed * (car.speed / maxSpeed) * dt;
    }

    car.speed = Math.max(0, Math.min(car.speed, maxSpeed));
    car.lastX = car.x;
    car.lastY = car.y;
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;

    // --- BOUNCE WALLS ---
    const track = this.tracks[this.currentTrackIndex];
    if (this.getDistToTrack(car.x, car.y, track.waypoints) > this.trackWidth / 2) {
        const nearest = this.getNearestPointOnTrack(car.x, car.y, track.waypoints);
        const normal = Math.atan2(car.y - nearest.y, car.x - nearest.x);
        car.angle = normal + (normal - car.angle); // Elastic bounce
        car.speed *= 0.8;
        car.health -= 2;
        // Push back inside
        car.x = nearest.x + Math.cos(normal) * (this.trackWidth / 2 - 5);
        car.y = nearest.y + Math.sin(normal) * (this.trackWidth / 2 - 5);
    }
    
    // Lap Track
    if (car.lastX < track.waypoints[0].x && car.x >= track.waypoints[0].x) car.lap++;
  }

  private processAI(car: any, dt: number) {
    const twp = this.tracks[this.currentTrackIndex].waypoints;
    const target = twp[car.targetWP];
    const dx = target.x - car.x;
    const dy = target.y - car.y;
    const dist = Math.sqrt(dx*dx+dy*dy);
    if (dist < 100) car.targetWP = (car.targetWP + 1) % twp.length;
    const tA = Math.atan2(dy, dx);
    let diff = tA - car.angle;
    while(diff > Math.PI) diff -= Math.PI*2;
    while(diff < -Math.PI) diff += Math.PI*2;
    this.processCarPhysics(car, { throttle: true, brake: Math.abs(diff) > 0.6, left: diff < -0.1, right: diff > 0.1 }, dt, false);
  }

  private drawScene(ctx: CanvasRenderingContext2D) {
    const track = this.tracks[this.currentTrackIndex];
    // Background
    ctx.fillStyle = '#102e12';
    ctx.fillRect(0, 0, 1200, 700);

    // Draw Pits
    this.drawPits(ctx, track.waypoints[0]);

    // Track
    ctx.strokeStyle = '#333';
    ctx.lineWidth = this.trackWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(track.waypoints[0].x, track.waypoints[0].y);
    track.waypoints.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.stroke();

    // Red/White Curbs (Physical Walls)
    ctx.setLineDash([20, 20]);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = this.trackWidth + 10;
    ctx.stroke();
    ctx.strokeStyle = '#f44336';
    ctx.lineWidth = this.trackWidth + 10;
    ctx.setLineDash([20, 20], 20);
    ctx.stroke();
    ctx.setLineDash([]);

    // Finish Line
    ctx.fillStyle = '#fff';
    ctx.fillRect(track.waypoints[0].x, track.waypoints[0].y - this.trackWidth/2, 10, this.trackWidth);

    // Cars
    this.drawCar(ctx, this.player, '#ffea00');
    this.aiCars.forEach(ai => this.drawCar(ctx, ai, ai.color));

    if (this.gamePhase === 'start') {
       this.drawCountdown(ctx);
    }
  }

  private drawPits(ctx: CanvasRenderingContext2D, start: any) {
    const pitY = start.y - this.trackWidth/2 - 40;
    this.teams.forEach((t, i) => {
       ctx.fillStyle = t.color;
       ctx.fillRect(start.x - 300 + i*120, pitY, 100, 30);
       ctx.fillStyle = '#fff';
       ctx.font = '10px Arial';
       ctx.fillText(t.name, start.x - 290 + i*120, pitY + 20);
    });
  }

  private drawCountdown(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, 1200, 700);
    ctx.font = '900 150px Orbitron';
    ctx.textAlign = 'center';
    ctx.fillStyle = this.countdown > 0 ? '#ff5252' : '#69f0ae';
    const text = this.countdown > 0 ? Math.ceil(this.countdown).toString() : 'GOO!';
    ctx.fillText(text, 600, 350);
  }

  private drawCar(ctx: CanvasRenderingContext2D, car: any, color: string) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    ctx.fillStyle = color;
    ctx.fillRect(-20, -10, 40, 20);
    ctx.fillStyle = '#000';
    ctx.fillRect(15, -12, 5, 24); // Front Wing
    // Health bar
    ctx.fillStyle = '#f44336';
    ctx.fillRect(-20, -20, 40, 4);
    ctx.fillStyle = '#69f0ae';
    ctx.fillRect(-20, -20, 40 * (car.health/100), 4);
    ctx.restore();
  }

  private getDistToTrack(x: number, y: number, wps: any[]) {
    let minD = 10000;
    for (let i=0; i<wps.length-1; i++) {
       const d = this.distToSegment(x, y, wps[i], wps[i+1]);
       if (d < minD) minD = d;
    }
    return minD;
  }

  private getNearestPointOnTrack(x: number, y: number, wps: any[]) {
    let minD = 10000;
    let nearest = {x:0, y:0};
    for (let i=0; i<wps.length-1; i++) {
       const p = this.getClosestPointOnSegment(x, y, wps[i], wps[i+1]);
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
    const dx = p2.x - p1.x; const dy = p2.y - p1.y;
    const t = ((x-p1.x)*dx + (y-p1.y)*dy) / (dx*dx + dy*dy);
    const ct = Math.max(0, Math.min(1, t));
    return { x: p1.x + ct*dx, y: p1.y + ct*dy };
  }
}
