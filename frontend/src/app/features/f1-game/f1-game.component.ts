import { Component, ElementRef, HostListener, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
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
    <div class="stadium-container">
      <div class="track-header">
        <div class="stats-card">
          <div class="stat">
            <span class="label">LAP</span>
            <span class="value">{{ (player?.lap || 0) + 1 }}<span>/{{ totalLaps }}</span></span>
          </div>
          <div class="stat">
            <span class="label">SPEED</span>
            <span class="value">{{ math.round(player?.speed || 0) }}<span>km/h</span></span>
          </div>
        </div>
        
        <div class="action-buttons">
          <select (change)="onTrackChange($event)" class="track-select">
            <option *ngFor="let t of tracks; let i = index" [value]="i">{{ t.name }}</option>
          </select>
          <button mat-mini-fab color="warn" (click)="resetGame()" matTooltip="Restart Session">
            <mat-icon>refresh</mat-icon>
          </button>
        </div>
      </div>

      <div class="game-viewport">
        <canvas #gameCanvas width="1200" height="700"></canvas>
        
        <div class="hud start-countdown" *ngIf="gamePhase === 'start'">
          {{ (countdown > 0) ? countdown : 'GOO!' }}
        </div>
        
        <div class="hud game-over" *ngIf="gamePhase === 'finished'">
          <h1>RACE FINISHED!</h1>
          <p>Final Position: #1</p>
          <button mat-raised-button color="primary" (click)="resetGame()">PLAY AGAIN</button>
        </div>

        <div class="hud damage-alert" *ngIf="(player?.health || 100) < 30">
          <mat-icon>warning</mat-icon> CRITICAL DAMAGE
        </div>
      </div>

      <div class="footer-hud">
        <div class="hud health-hud">
          <div class="bar-container">
            <div class="bar health-bar" [style.width.%]="player?.health || 0"></div>
          </div>
          <span class="label">STRATEGY: {{ (player?.health || 0) > 50 ? 'AGGRESSIVE' : 'DEFENSIVE' }}</span>
        </div>
        
        <div class="hud tire-hud" [class.low-grip]="(player?.tireWear || 1.0) < 0.4">
          <div class="bar-container">
            <div class="bar tire-bar" [style.width.%]="(player?.tireWear || 0) * 100"></div>
          </div>
          <span class="label">TIRE LIFE</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stadium-container { width: 100%; height: 100%; background: #0a0a0c; color: #fff; padding: 20px; font-family: 'Orbitron', sans-serif; }
    .track-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
    .stats-card { background: rgba(255,255,255,0.05); padding: 10px 20px; border-radius: 12px; display: flex; gap: 30px; }
    .stat .label { display: block; font-size: 10px; color: #888; letter-spacing: 2px; }
    .stat .value { font-size: 24px; color: #ff003c; font-weight: 700; }
    .stat .value span { font-size: 12px; color: #555; margin-left: 2px; }
    
    .game-viewport { position: relative; border-radius: 20px; overflow: hidden; box-shadow: 0 0 50px rgba(0,0,0,0.5); border: 2px solid #222; }
    canvas { display: block; background: #1a1a1e; }
    
    .hud { position: absolute; pointer-events: none; }
    .start-countdown { top: 50%; left: 50%; transform: translate(-50%,-50%); font-size: 120px; color: #ff003c; text-shadow: 0 0 30px #ff003c; }
    .game-over { top:0; left:0; width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background:rgba(0,0,0,0.8); pointer-events: auto; }
    
    .footer-hud { display: flex; gap: 20px; margin-top: 20px; }
    .health-hud, .tire-hud { flex: 1; background: rgba(0,0,0,0.3); padding: 15px; border-radius: 10px; border: 1px solid #333; }
    .bar-container { width: 100%; height: 8px; background: #222; border-radius: 4px; overflow: hidden; margin-bottom: 8px; }
    .bar { height: 100%; transition: width 0.3s ease; }
    .health-bar { background: linear-gradient(90deg, #ff003c, #ff4d00); }
    .tire-bar { background: linear-gradient(90deg, #00d2ff, #3a7bd5); }
    .low-grip { border-color: #ff003c; animation: pulse 1s infinite; }
    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
    
    .track-select { background: #111; color: #fff; border: 1px solid #333; padding: 8px 15px; border-radius: 8px; margin-right: 15px; }
  `]
})
export class F1GameComponent implements AfterViewInit, OnDestroy {
  @ViewChild('gameCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private animationId!: number;
  math = Math;

  // Game Configuration
  totalLaps = 3;
  trackWidth = 140;
  
  // Game State
  gamePhase: 'start' | 'racing' | 'finished' = 'start';
  countdown = 3;
  lastTime = 0;
  
  tracks = [
    { name: 'Monaco GP', waypoints: [{x:150, y:150}, {x:500, y:100}, {x:900, y:150}, {x:1050, y:400}, {x:850, y:600}, {x:400, y:620}, {x:100, y:450}, {x:150, y:150}], color: '#ff003c' },
    { name: 'Silverstone', waypoints: [{x:100, y:100}, {x:1000, y:100}, {x:1000, y:600}, {x:100, y:600}, {x:100, y:100}], color: '#00d2ff' }
  ];
  currentTrackIndex = 0;

  teams = [
    { name: 'Red Bull', color: '#0600ef' },
    { name: 'Mercedes', color: '#00d2be' },
    { name: 'Ferrari', color: '#dc0000' }
  ];

  player: any = { health: 100, tireWear: 1.0, lap: 0, speed: 0 };
  aiCars: any[] = [];

  constructor() {
    this.resetGame();
  }

  ngAfterViewInit() {
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.startGameLoop();
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animationId);
  }

  resetGame() {
    const track = this.tracks[this.currentTrackIndex];
    this.player = {
      id: 0, x: track.waypoints[0].x, y: track.waypoints[0].y, angle: 0, speed: 0, lap: 0,
      steeringAngle: 0, tireWear: 1.0, health: 100, lastX: track.waypoints[0].x, lastY: track.waypoints[0].y
    };

    this.aiCars = this.teams.slice(1).map((team, i) => ({
      id: i + 1, x: track.waypoints[0].x - (i+1)*50, y: track.waypoints[0].y + 20, 
      angle: 0, speed: 0, lap: 0, steeringAngle: 0, targetWP: 1, color: team.color, health: 100
    }));

    this.gamePhase = 'start';
    this.countdown = 3;
    this.lastTime = performance.now();
  }

  onTrackChange(event: any) {
    this.currentTrackIndex = +event.target.value;
    this.resetGame();
  }

  private keys: { [key: string]: boolean } = {};
  @HostListener('window:keydown', ['$event']) onKeyDown(e: KeyboardEvent) { this.keys[e.key] = true; }
  @HostListener('window:keyup', ['$event']) onKeyUp(e: KeyboardEvent) { this.keys[e.key] = false; }

  private startGameLoop() {
    const loop = (time: number) => {
      const dt = (time - this.lastTime) / 1000;
      this.lastTime = time;
      this.update(dt);
      this.draw();
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
    this.checkCollisions();
  }

  private updateCar(car: any, input: any, dt: number) {
    const accel = 400, friction = 0.98, turnSpeed = 3.0;
    
    if (input.ArrowUp || input.w) car.speed += accel * dt;
    if (input.ArrowDown || input.s) car.speed -= accel * dt * 0.5;
    
    car.speed *= friction;
    
    if (input.ArrowLeft || input.a) car.angle -= turnSpeed * dt * (car.speed / 200);
    if (input.ArrowRight || input.d) car.angle += turnSpeed * dt * (car.speed / 200);
    
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    
    // Boundary check
    this.checkBoundaries(car);
  }

  private updateAI(car: any, dt: number) {
    const track = this.tracks[this.currentTrackIndex];
    const target = track.waypoints[car.targetWP];
    const dx = target.x - car.x, dy = target.y - car.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    if (dist < 100) car.targetWP = (car.targetWP + 1) % track.waypoints.length;
    
    const targetAngle = Math.atan2(dy, dx);
    car.angle += (targetAngle - car.angle) * 2 * dt;
    car.speed = 350;
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
  }

  private checkBoundaries(car: any) {
    const track = this.tracks[this.currentTrackIndex];
    let onTrack = false;
    for (let i = 0; i < track.waypoints.length; i++) {
      const p1 = track.waypoints[i], p2 = track.waypoints[(i+1)%track.waypoints.length];
      const dist = this.distToSegment({x: car.x, y: car.y}, p1, p2);
      if (dist < this.trackWidth/2) onTrack = true;
    }
    
    if (!onTrack) {
      car.speed *= 0.5;
      car.health -= 0.1;
    }
  }

  private checkCollisions() {
    this.aiCars.forEach(ai => {
      const dx = this.player.x - ai.x, dy = this.player.y - ai.y;
      if (Math.sqrt(dx*dx + dy*dy) < 40) {
        this.player.speed *= -0.5;
        this.player.health -= 5;
        ai.speed *= -0.5;
      }
    });
  }

  private draw() {
    this.ctx.clearRect(0, 0, 1200, 700);
    this.drawTrack();
    this.drawCar(this.player, '#0600ef');
    this.aiCars.forEach(ai => this.drawCar(ai, ai.color));
  }

  private drawTrack() {
    const track = this.tracks[this.currentTrackIndex];
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = this.trackWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(track.waypoints[0].x, track.waypoints[0].y);
    track.waypoints.forEach(w => this.ctx.lineTo(w.x, w.y));
    this.ctx.closePath();
    this.ctx.stroke();
    
    this.ctx.strokeStyle = '#fff';
    this.ctx.setLineDash([20, 20]);
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  private drawCar(car: any, color: string) {
    this.ctx.save();
    this.ctx.translate(car.x, car.y);
    this.ctx.rotate(car.angle);
    this.ctx.fillStyle = color;
    this.ctx.fillRect(-20, -10, 40, 20);
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(10, -12, 5, 24); // Front wing
    this.ctx.fillRect(-15, -12, 5, 24); // Rear wing
    this.ctx.restore();
  }

  private distToSegment(p: any, v: any, w: any) {
    const l2 = (v.x-w.x)**2 + (v.y-w.y)**2;
    if (l2 === 0) return Math.sqrt((p.x-v.x)**2 + (p.y-v.y)**2);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.sqrt((p.x - (v.x + t * (w.x - v.x)))**2 + (p.y - (v.y + t * (w.y - v.y)))**2);
  }
}
