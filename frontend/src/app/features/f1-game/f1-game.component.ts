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
            <span class="label">DRIFT</span>
            <span class="value" [class.drifting]="(player?.driftIntensity || 0) > 0.5">
              {{ math.round((player?.driftIntensity || 0) * 100) }}%
            </span>
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
      </div>

      <div class="footer-hud">
        <div class="hud telemetry">
          <div class="bar-container"><div class="bar health-bar" [style.width.%]="player?.health || 0"></div></div>
          <span class="label">ENGINE INTEGRITY</span>
        </div>
        <div class="hud telemetry">
          <div class="bar-container"><div class="bar tire-bar" [style.width.%]="(player?.tireWear || 0) * 100"></div></div>
          <span class="label">TIRE PERFORMANCE</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stadium-container { width: 100%; height: 100vh; background: #020202; color: #fff; padding: 20px; font-family: 'Orbitron', sans-serif; overflow: hidden; }
    .track-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
    .stats-card { background: rgba(30,30,40,0.8); padding: 15px 30px; border-radius: 12px; display: flex; gap: 40px; border-bottom: 3px solid #00d2ff; }
    .stat .label { display: block; font-size: 10px; color: #00d2ff; letter-spacing: 2px; margin-bottom: 5px; }
    .stat .value { font-size: 32px; color: #fff; font-weight: 700; }
    .stat .value.drifting { color: #ff003c; text-shadow: 0 0 10px #ff003c; }
    .stat .value span { font-size: 14px; color: #444; }
    
    .game-viewport { position: relative; border-radius: 24px; overflow: hidden; border: 4px solid #1a1a1a; box-shadow: 0 0 40px rgba(0,210,255,0.1); }
    canvas { display: block; background: #0a0a0c; cursor: crosshair; }
    
    .hud { position: absolute; pointer-events: none; }
    .start-countdown { top: 50%; left: 50%; transform: translate(-50%,-50%); font-size: 160px; color: #fff; font-weight: 900; }
    
    .footer-hud { display: flex; gap: 20px; margin-top: 20px; }
    .telemetry { flex: 1; background: rgba(10,10,15,0.9); padding: 20px; border-radius: 12px; border: 1px solid #222; }
    .bar-container { width: 100%; height: 6px; background: #111; border-radius: 3px; overflow: hidden; margin-bottom: 10px; }
    .bar { height: 100%; transition: width 0.1s linear; }
    .health-bar { background: #ff003c; box-shadow: 0 0 15px #ff003c; }
    .tire-bar { background: #00d2ff; box-shadow: 0 0 15px #00d2ff; }
    .track-select { background: #050505; color: #fff; border: 1px solid #333; padding: 10px 20px; border-radius: 8px; font-family: 'Orbitron'; }
  `]
})
export class F1GameComponent implements AfterViewInit, OnDestroy {
  @ViewChild('gameCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private animationId!: number;
  math = Math;

  // Hyperdrive Engine Constants
  private readonly MAX_TORQUE = 2000;
  private readonly MAX_STEER = 0.3; // Approx 17 degrees in radians
  private readonly FRICTION = 0.98;
  
  totalLaps = 5;
  trackWidth = 150;
  wallThickness = 8;
  
  tracks = [
    { name: 'Hyperdrive Ring', waypoints: [{x:200, y:200}, {x:600, y:120}, {x:1000, y:200}, {x:1050, y:500}, {x:600, y:620}, {x:150, y:500}, {x:200, y:200}], color: '#ff003c' },
    { name: 'Yas Marina Night', waypoints: [{x:100, y:100}, {x:1100, y:100}, {x:1100, y:600}, {x:100, y:600}, {x:100, y:100}], color: '#00d2ff' }
  ];
  currentTrackIndex = 0;

  teams = [
    { name: 'Red Bull Racing', color: '#0600ef', secondary: '#fcd700' },
    { name: 'Mercedes-AMG', color: '#00d2be', secondary: '#ffffff' },
    { name: 'Scuderia Ferrari', color: '#dc0000', secondary: '#ffffff' },
    { name: 'McLaren F1', color: '#ff8700', secondary: '#000000' }
  ];

  player: any = { health: 100, tireWear: 1.0, lap: 0, speed: 0, driftIntensity: 0 };
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
      id: 0, x: track.waypoints[0].x, y: track.waypoints[0].y, angle: 0, speed: 0, lap: 0,
      steeringAngle: 0, tireWear: 1.0, health: 100, driftIntensity: 0, color: '#ffffff'
    };

    this.aiCars = this.teams.slice(1).map((team, i) => ({
      id: i + 1, x: track.waypoints[0].x - (i+1)*60, y: track.waypoints[0].y + 30, 
      angle: 0, speed: 0, lap: 0, targetWP: 1, color: team.color, secondary: team.secondary, health: 100
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

    this.updateHyperdrivePhysics(this.player, this.keys, dt);
    this.aiCars.forEach(ai => this.updateAI(ai, dt));
    this.checkCollisions();
  }

  private updateHyperdrivePhysics(car: any, input: any, dt: number) {
    // Throttle & Braking (Mapping maxThrottle = 2000)
    let throttle = 0;
    if (input.ArrowUp || input.w) throttle = 1;
    if (input.ArrowDown || input.s) throttle = -0.5;
    
    car.speed += (throttle * this.MAX_TORQUE) * dt;
    car.speed *= this.FRICTION;

    // Steering (Mapping maxSteer = 17 deg)
    let steerInput = 0;
    if (input.ArrowLeft || input.a) steerInput = -1;
    if (input.ArrowRight || input.d) steerInput = 1;
    
    const steerAngle = steerInput * this.MAX_STEER;
    if (Math.abs(car.speed) > 20) {
      car.angle += steerAngle * (car.speed / 500) * dt * 5;
    }

    // Drift Intensity Math (from Wheel.cs)
    const lateralSlip = Math.abs(steerInput * car.speed * 0.002);
    car.driftIntensity = Math.min(1, lateralSlip);

    const nextX = car.x + Math.cos(car.angle) * car.speed * dt;
    const nextY = car.y + Math.sin(car.angle) * car.speed * dt;

    if (this.isLocationOnTrack(nextX, nextY)) {
      car.x = nextX;
      car.y = nextY;
    } else {
      // Hyperdrive "Hit Back" Physics
      car.speed *= -0.5; // Bounce
      car.health -= 3;
      car.angle += (Math.random() - 0.5) * 0.5; // Randomize spin on hit
    }
    
    car.tireWear -= Math.abs(car.speed) * 0.000005;
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
    
    if (dist < 150) car.targetWP = (car.targetWP + 1) % track.waypoints.length;
    
    const targetAngle = Math.atan2(dy, dx);
    let diff = targetAngle - car.angle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    
    car.angle += diff * 2.5 * dt;
    car.speed = 360;
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
  }

  private checkCollisions() {
    this.aiCars.forEach(ai => {
      const dx = this.player.x - ai.x, dy = this.player.y - ai.y;
      if (Math.sqrt(dx*dx + dy*dy) < 50) {
        this.player.speed *= -0.7;
        this.player.health -= 10;
        ai.speed *= -0.7;
      }
    });
  }

  private draw() {
    this.ctx.clearRect(0, 0, 1200, 700);
    this.drawEnvironment();
    this.drawTrack();
    this.drawF1Car(this.player, '#ffffff', '#00d2ff', true);
    this.aiCars.forEach(ai => this.drawF1Car(ai, ai.color, ai.secondary, false));
  }

  private drawEnvironment() {
    this.ctx.fillStyle = '#050508';
    this.ctx.fillRect(0, 0, 1200, 700);
    // Grid pattern
    this.ctx.strokeStyle = '#111';
    this.ctx.lineWidth = 1;
    for(let i=0; i<1200; i+=100) { this.ctx.beginPath(); this.ctx.moveTo(i,0); this.ctx.lineTo(i,700); this.ctx.stroke(); }
  }

  private drawTrack() {
    const track = this.tracks[this.currentTrackIndex];
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';
    
    // Concrete Curb
    this.ctx.strokeStyle = '#ff003c';
    this.ctx.lineWidth = this.trackWidth + 10;
    this.ctx.beginPath();
    this.ctx.moveTo(track.waypoints[0].x, track.waypoints[0].y);
    track.waypoints.forEach(w => this.ctx.lineTo(w.x, w.y));
    this.ctx.closePath();
    this.ctx.stroke();

    // Asphalt
    this.ctx.strokeStyle = '#1a1a1e';
    this.ctx.lineWidth = this.trackWidth;
    this.ctx.stroke();
    
    // Racing Line
    this.ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([40, 60]);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  private drawF1Car(car: any, primary: string, secondary: string, isPlayer: boolean) {
    this.ctx.save();
    this.ctx.translate(car.x, car.y);
    this.ctx.rotate(car.angle);
    
    // Drift Smoke
    if (car.driftIntensity > 0.4) {
        this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
        this.ctx.beginPath();
        this.ctx.arc(-20, 15, 10 * car.driftIntensity, 0, Math.PI*2);
        this.ctx.arc(-20, -15, 10 * car.driftIntensity, 0, Math.PI*2);
        this.ctx.fill();
    }

    // Aero Body
    this.ctx.fillStyle = primary;
    this.ctx.shadowBlur = isPlayer ? 15 : 0;
    this.ctx.shadowColor = secondary;
    
    // Nose & Cockpit
    this.ctx.beginPath();
    this.ctx.moveTo(35, 0);
    this.ctx.lineTo(10, 8);
    this.ctx.lineTo(-20, 12);
    this.ctx.lineTo(-25, 0);
    this.ctx.lineTo(-20, -12);
    this.ctx.lineTo(10, -8);
    this.ctx.closePath();
    this.ctx.fill();

    // Secondary Color (Pods)
    this.ctx.fillStyle = secondary;
    this.ctx.fillRect(-10, -11, 15, 22);
    
    // Wings
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(25, -14, 8, 28); // Front Wing
    this.ctx.fillRect(-30, -15, 10, 30); // Rear Wing
    
    // Tires (Wide Rubber)
    const tW = 12, tH = 10;
    this.ctx.fillRect(12, -22, tW, tH); // FR
    this.ctx.fillRect(12, 12, tW, tH);  // FL
    this.ctx.fillRect(-22, -22, tW + 2, tH + 2); // RR
    this.ctx.fillRect(-22, 12, tW + 2, tH + 2);  // RL

    if (isPlayer && car.speed > 300) {
        // Brake Glow
        this.ctx.fillStyle = '#ff4d00';
        this.ctx.fillRect(12, -22, 2, tH);
        this.ctx.fillRect(12, 12, 2, tH);
    }

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
