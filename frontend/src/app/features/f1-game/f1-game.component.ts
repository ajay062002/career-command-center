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
          <div class="stat">
            <span class="label">HEALTH</span>
            <span class="value">{{ math.round(player?.health || 0) }}%</span>
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
      </div>

      <div class="footer-hud">
        <div class="hud telemetry">
          <div class="bar-container"><div class="bar health-bar" [style.width.%]="player?.health || 0"></div></div>
          <span class="label">VEHICLE INTEGRITY</span>
        </div>
        <div class="hud telemetry">
          <div class="bar-container"><div class="bar tire-bar" [style.width.%]="(player?.tireWear || 0) * 100"></div></div>
          <span class="label">TIRE DEGRADATION</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stadium-container { width: 100%; height: 100vh; background: #050505; color: #fff; padding: 20px; font-family: 'Orbitron', sans-serif; overflow: hidden; }
    .track-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
    .stats-card { background: rgba(255,255,255,0.05); padding: 10px 20px; border-radius: 12px; display: flex; gap: 40px; border-left: 4px solid #ff003c; }
    .stat .label { display: block; font-size: 10px; color: #aaa; letter-spacing: 1.5px; }
    .stat .value { font-size: 28px; color: #fff; font-weight: 700; }
    .stat .value span { font-size: 14px; color: #666; }
    
    .game-viewport { position: relative; border-radius: 24px; overflow: hidden; border: 3px solid #1a1a1a; background: #111; }
    canvas { display: block; filter: contrast(1.1) saturate(1.2); }
    
    .hud { position: absolute; pointer-events: none; }
    .start-countdown { top: 50%; left: 50%; transform: translate(-50%,-50%); font-size: 140px; color: #fff; text-shadow: 0 0 30px #ff003c; font-weight: 900; }
    .game-over { top:0; left:0; width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background:rgba(0,0,0,0.9); pointer-events: auto; }
    
    .footer-hud { display: flex; gap: 20px; margin-top: 20px; }
    .telemetry { flex: 1; background: rgba(20,20,20,0.8); padding: 15px; border-radius: 12px; border: 1px solid #333; }
    .bar-container { width: 100%; height: 6px; background: #222; border-radius: 3px; overflow: hidden; margin-bottom: 8px; }
    .bar { height: 100%; transition: width 0.2s ease; }
    .health-bar { background: linear-gradient(90deg, #ff003c, #ff8000); box-shadow: 0 0 10px #ff003c; }
    .tire-bar { background: linear-gradient(90deg, #00d2ff, #0044ff); box-shadow: 0 0 10px #00d2ff; }
    .track-select { background: #111; color: #fff; border: 1px solid #444; padding: 10px 20px; border-radius: 10px; font-family: 'Orbitron'; }
  `]
})
export class F1GameComponent implements AfterViewInit, OnDestroy {
  @ViewChild('gameCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private animationId!: number;
  math = Math;

  // Configuration
  totalLaps = 3;
  trackWidth = 140;
  wallThickness = 6;
  
  tracks = [
    { name: 'Monaco Night GP', waypoints: [{x:150, y:200}, {x:550, y:120}, {x:950, y:180}, {x:1050, y:450}, {x:750, y:620}, {x:350, y:580}, {x:120, y:400}, {x:150, y:200}], color: '#00d2ff' },
    { name: 'Interlagos', waypoints: [{x:200, y:150}, {x:1000, y:150}, {x:1000, y:550}, {x:200, y:550}, {x:200, y:150}], color: '#00ff40' }
  ];
  currentTrackIndex = 0;

  teams = [
    { name: 'Red Bull', color: '#0600ef', pits: '#0b0080' },
    { name: 'Mercedes', color: '#00d2be', pits: '#008080' },
    { name: 'Ferrari', color: '#dc0000', pits: '#800000' },
    { name: 'McLaren', color: '#ff8700', pits: '#b35d00' }
  ];

  player: any = { health: 100, tireWear: 1.0, lap: 0, speed: 0 };
  aiCars: any[] = [];
  gamePhase: 'start' | 'racing' | 'finished' = 'start';
  countdown = 3;
  lastTime = 0;

  constructor() { this.resetGame(); }

  ngAfterViewInit() {
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.startGameLoop();
  }

  ngOnDestroy() { cancelAnimationFrame(this.animationId); }

  resetGame() {
    const track = this.tracks[this.currentTrackIndex];
    this.player = {
      id: 0, x: track.waypoints[0].x, y: track.waypoints[0].y, angle: 0, speed: 0, lap: 5,
      steeringAngle: 0, tireWear: 1.0, health: 100, lastX: track.waypoints[0].x, lastY: track.waypoints[0].y,
      color: '#ffffff'
    };

    this.aiCars = this.teams.slice(1).map((team, i) => ({
      id: i + 1, x: track.waypoints[0].x - (i+1)*50, y: track.waypoints[0].y + 20, 
      angle: 0, speed: 0, lap: 0, targetWP: 1, color: team.color, health: 100
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
      const dt = Math.min((time - this.lastTime) / 1000, 0.1);
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
    const accel = 600, friction = 0.97, turnSpeed = 3.5;
    
    if (input.ArrowUp || input.w) car.speed += accel * dt;
    if (input.ArrowDown || input.s) car.speed -= accel * dt * 0.7;
    
    car.speed *= friction;
    
    if (Math.abs(car.speed) > 10) {
      if (input.ArrowLeft || input.a) car.angle -= turnSpeed * dt * (car.speed / 400);
      if (input.ArrowRight || input.d) car.angle += turnSpeed * dt * (car.speed / 400);
    }
    
    const nextX = car.x + Math.cos(car.angle) * car.speed * dt;
    const nextY = car.y + Math.sin(car.angle) * car.speed * dt;
    
    // Wall / Boundary check with BOUNCE
    const onTrack = this.isLocationOnTrack(nextX, nextY);
    if (onTrack) {
      car.x = nextX;
      car.y = nextY;
    } else {
      // BOUNCE BACK PHYSICS
      car.speed *= -0.4; // Bounce backward
      car.health -= 2;   // Wall damage
      // Nudge back towards center
      const track = this.tracks[this.currentTrackIndex];
      const closest = track.waypoints[0];
      car.x += (closest.x - car.x) * 0.1;
      car.y += (closest.y - car.y) * 0.1;
    }

    car.tireWear -= Math.abs(car.speed) * 0.00001;
  }

  private isLocationOnTrack(x: number, y: number): boolean {
    const track = this.tracks[this.currentTrackIndex];
    for (let i = 0; i < track.waypoints.length; i++) {
        const p1 = track.waypoints[i], p2 = track.waypoints[(i+1)%track.waypoints.length];
        if (this.distToSegment({x, y}, p1, p2) < (this.trackWidth/2 - this.wallThickness)) return true;
    }
    return false;
  }

  private updateAI(car: any, dt: number) {
    const track = this.tracks[this.currentTrackIndex];
    const target = track.waypoints[car.targetWP];
    const dx = target.x - car.x, dy = target.y - car.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    if (dist < 120) car.targetWP = (car.targetWP + 1) % track.waypoints.length;
    
    const targetAngle = Math.atan2(dy, dx);
    let diff = targetAngle - car.angle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    
    car.angle += diff * 3 * dt;
    car.speed = 320;
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
  }

  private checkCollisions() {
    this.aiCars.forEach(ai => {
      const dx = this.player.x - ai.x, dy = this.player.y - ai.y;
      const d = Math.sqrt(dx*dx + dy*dy);
      if (d < 45) {
        this.player.speed *= -0.6;
        this.player.health -= 5;
        ai.speed *= -0.6;
      }
    });
  }

  private draw() {
    this.ctx.fillStyle = '#050505'; // Darkness
    this.ctx.fillRect(0, 0, 1200, 700);
    this.drawStadium();
    this.drawTrack();
    this.player.id === 0 && this.drawCar(this.player, '#ffffff', true);
    this.aiCars.forEach(ai => this.drawCar(ai, ai.color, false));
  }

  private drawStadium() {
    // Grandstands
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(50, 50, 200, 40);
    this.ctx.fillRect(900, 600, 250, 40);
    // Floodlights
    const time = Date.now() / 1000;
    for(let i=0; i<8; i++) {
        const x = i * 160 + 50, y = (i%2==0) ? 20 : 680;
        this.ctx.fillStyle = '#ff003c';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 5, 0, Math.PI*2);
        this.ctx.fill();
        // Light glow
        const glow = Math.sin(time * 2 + i) * 10 + 20;
        const grad = this.ctx.createRadialGradient(x, y, 0, x, y, glow);
        grad.addColorStop(0, 'rgba(255,0,60,0.3)');
        grad.addColorStop(1, 'rgba(255,0,0,0)');
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(x-50, y-50, 100, 100);
    }
  }

  private drawTrack() {
    const track = this.tracks[this.currentTrackIndex];
    
    // Asphalt
    this.ctx.strokeStyle = '#1a1a1e';
    this.ctx.lineWidth = this.trackWidth;
    this.ctx.lineJoin = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(track.waypoints[0].x, track.waypoints[0].y);
    track.waypoints.forEach(w => this.ctx.lineTo(w.x, w.y));
    this.ctx.closePath();
    this.ctx.stroke();

    // Red/White Curbs (Outer Wall)
    this.ctx.strokeStyle = '#ff003c';
    this.ctx.lineWidth = this.trackWidth + this.wallThickness;
    this.ctx.stroke();
    
    // Inner Wall
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = this.trackWidth - this.wallThickness*2;
    this.ctx.stroke();

    // Re-fill Asphalt over inner wall stroke gaps
    this.ctx.strokeStyle = '#1a1a1e';
    this.ctx.lineWidth = this.trackWidth - (this.wallThickness * 4);
    this.ctx.stroke();

    // Center Line
    this.ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    this.ctx.setLineDash([30, 30]);
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    
    // Pit Lane (Team Boxes)
    this.teams.forEach((team, i) => {
        this.ctx.fillStyle = team.pits;
        this.ctx.fillRect(track.waypoints[0].x - 100 + (i*40), track.waypoints[0].y - 90, 35, 20);
    });
  }

  private drawCar(car: any, color: string, isPlayer: boolean) {
    this.ctx.save();
    this.ctx.translate(car.x, car.y);
    this.ctx.rotate(car.angle);
    
    // Body
    this.ctx.fillStyle = color;
    this.ctx.shadowBlur = isPlayer ? 15 : 0;
    this.ctx.shadowColor = color;
    this.ctx.fillRect(-22, -11, 44, 22);
    
    // Details
    this.ctx.fillStyle = '#0a0a0a';
    this.ctx.fillRect(12, -13, 6, 26); // Front wing
    this.ctx.fillRect(-18, -13, 6, 26); // Rear wing
    this.ctx.fillRect(-10, -11, 2, 22); // Roll hoop
    
    // Tires
    this.ctx.fillStyle = '#000';
    const tW = 10, tH = 8;
    this.ctx.fillRect(10, -18, tW, tH);
    this.ctx.fillRect(10, 10, tW, tH);
    this.ctx.fillRect(-20, -18, tW, tH);
    this.ctx.fillRect(-20, 10, tW, tH);
    
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
