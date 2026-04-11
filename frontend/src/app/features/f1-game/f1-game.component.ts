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
    <div class="f1-stadium">
      <div class="top-nav">
        <div class="branding">
          <mat-icon class="pulse">sensors</mat-icon>
          <span>SYSTEM SHEETZ <span>F1-PRO</span></span>
        </div>
        
        <div class="telemetry-top">
          <div class="t-item">
            <span class="t-label">CURRENT LAP</span>
            <span class="t-value">{{ (player?.lap || 0) + 1 }}<span>/{{ totalLaps }}</span></span>
          </div>
          <div class="t-divider"></div>
          <div class="t-item">
            <span class="t-label">VELOCITY</span>
            <span class="t-value">{{ math.round(player?.speed || 0) }}<span>KM/H</span></span>
          </div>
        </div>

        <div class="controls">
          <select (change)="onTrackChange($event)" class="circuit-picker">
            <option *ngFor="let t of tracks; let i = index" [value]="i">{{ t.name }}</option>
          </select>
          <button mat-fab extended color="warn" (click)="resetGame()" class="reboot-btn">
            <mat-icon>restart_alt</mat-icon> REBOOT ENGINE
          </button>
        </div>
      </div>

      <div class="arena">
        <canvas #gameCanvas width="1400" height="750"></canvas>
        
        <div class="overlay countdown" *ngIf="gamePhase === 'start'">
          <div class="lights">
            <div class="light" [class.red]="countdown > 2"></div>
            <div class="light" [class.red]="countdown > 1"></div>
            <div class="light" [class.green]="countdown <= 0"></div>
          </div>
          <span class="msg">{{ countdown > 0 ? math.ceil(countdown) : 'PUSH!' }}</span>
        </div>

        <div class="overlay finish" *ngIf="gamePhase === 'finished'">
          <div class="glass-card">
            <mat-icon class="gold">emoji_events</mat-icon>
            <h2>P1 FINISH</h2>
            <p>CHAMPIONSHIP POINTS: +25</p>
            <button mat-raised-button color="accent" (click)="resetGame()">NEXT CIRCUIT</button>
          </div>
        </div>
      </div>

      <div class="telemetry-footer">
        <div class="monitor">
          <div class="header">
            <mat-icon>query_stats</mat-icon>
            <span>ENGINE CORE</span>
          </div>
          <div class="gauge-box">
            <div class="gauge-bar"><div class="fill health" [style.width.%]="player?.health || 0"></div></div>
            <div class="labels"><span>STRUCTURAL INTEGRITY</span><span>{{ player?.health || 0 }}%</span></div>
          </div>
        </div>

        <div class="monitor">
          <div class="header">
            <mat-icon>tire_repair</mat-icon>
            <span>PIRELLI RUBBER</span>
          </div>
          <div class="gauge-box">
            <div class="gauge-bar"><div class="fill tires" [style.width.%]="(player?.tireWear || 0) * 100"></div></div>
            <div class="labels"><span>TIRE PERFORMANCE</span><span>{{ math.round((player?.tireWear || 0) * 100) }}%</span></div>
          </div>
        </div>

        <div class="strategy-comms">
          <div class="comms-box">
             <span class="tag">RADIO</span>
             <span class="text">"{{ (player?.health || 0) > 40 ? 'BOX BOX. Hammertime!' : 'SAVE TIRES. Defensive mode active.' }}"</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .f1-stadium { width: 100%; height: 100%; background: #000; color: #fff; font-family: 'Inter', sans-serif; display: flex; flex-direction: column; padding: 20px; box-sizing: border-box; }
    
    .top-nav { display: flex; justify-content: space-between; align-items: center; background: rgba(20,20,25,0.8); padding: 15px 30px; border-radius: 15px; border: 1px solid #333; margin-bottom: 20px; backdrop-filter: blur(10px); }
    .branding { display: flex; align-items: center; gap: 15px; font-weight: 800; font-style: italic; }
    .branding span span { color: #ff003c; }
    .pulse { color: #ff003c; animation: pulse 1s infinite; }
    
    .telemetry-top { display: flex; gap: 25px; align-items: center; }
    .t-item { text-align: center; }
    .t-label { display: block; font-size: 10px; color: #777; letter-spacing: 2px; }
    .t-value { font-size: 28px; font-weight: 900; font-family: 'Orbitron'; }
    .t-value span { font-size: 14px; color: #444; margin-left: 2px; }
    .t-divider { width: 1px; height: 30px; background: #333; }

    .circuit-picker { background: #111; color: #fff; border: 1px solid #444; padding: 10px 15px; border-radius: 8px; margin-right: 20px; outline: none; }
    
    .arena { position: relative; flex: 1; border-radius: 20px; overflow: hidden; border: 2px solid #222; box-shadow: 0 40px 100px rgba(0,0,0,0.8); }
    canvas { display: block; background: #050505; }
    
    .overlay { position: absolute; top:0; left:0; width:100%; height:100%; display: flex; justify-content: center; align-items: center; z-index: 10; pointer-events: none; }
    .countdown { background: rgba(0,0,0,0.4); flex-direction: column; gap: 20px; }
    .lights { display: flex; gap: 15px; }
    .light { width: 30px; height: 30px; background: #222; border-radius: 50%; border: 2px solid #444; }
    .light.red { background: #ff003c; box-shadow: 0 0 20px #ff003c; }
    .light.green { background: #00ff40; box-shadow: 0 0 20px #00ff40; }
    .countdown .msg { font-size: 120px; font-weight: 900; font-family: 'Orbitron'; text-shadow: 0 0 40px rgba(255,255,255,0.5); }
    
    .finish { pointer-events: auto; }
    .glass-card { background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); padding: 40px 60px; border-radius: 30px; border: 1px solid rgba(255,255,255,0.1); text-align: center; }
    .gold { font-size: 80px; width: 80px; height: 80px; color: #ffd700; margin-bottom: 20px; }
    
    .telemetry-footer { display: flex; gap: 20px; margin-top: 20px; }
    .monitor { flex: 1; background: rgba(255,255,255,0.03); padding: 20px; border-radius: 15px; border-left: 5px solid #00d2ff; }
    .monitor .header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; color: #666; font-size: 11px; font-weight: 700; }
    .gauge-box { width: 100%; }
    .gauge-bar { width: 100%; height: 6px; background: #111; border-radius: 3px; overflow: hidden; margin-bottom: 10px; }
    .fill { height: 100%; transition: width 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
    .fill.health { background: linear-gradient(90deg, #ff003c, #ff7e00); }
    .fill.tires { background: linear-gradient(90deg, #00d2ff, #2979ff); }
    .labels { display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; color: #888; letter-spacing: 1px; }

    .strategy-comms { flex: 2; display: flex; align-items: center; }
    .comms-box { background: rgba(0,210,255,0.05); padding: 15px 30px; border-radius: 12px; border: 1px dashed rgba(0,210,255,0.3); width: 100%; display: flex; align-items: center; gap: 20px; }
    .tag { background: #00d2ff; color: #000; font-size: 9px; font-weight: 900; padding: 2px 8px; border-radius: 4px; }
    .comms-box .text { font-family: 'Orbitron'; font-size: 12px; color: #00d2ff; }

    @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
  `]
})
export class F1GameComponent implements AfterViewInit, OnDestroy {
  @ViewChild('gameCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private animationId!: number;
  math = Math;

  totalLaps = 3;
  trackWidth = 160;
  
  tracks = [
    { name: 'Silverstone GP', waypoints: [{x:150, y:150}, {x:1200, y:150}, {x:1200, y:600}, {x:150, y:600}, {x:150, y:150}], color: '#00d2ff' },
    { name: 'Monaco Night', waypoints: [{x:200, y:200}, {x:600, y:120}, {x:1100, y:250}, {x:1000, y:550}, {x:500, y:630}, {x:150, y:450}, {x:200, y:200}], color: '#ff003c' }
  ];
  currentTrackIndex = 0;

  teams = [
    { name: 'Red Bull', c1: '#0600ef', c2: '#fcd700' },
    { name: 'Mercedes', c1: '#00d2be', c2: '#ffffff' },
    { name: 'Ferrari', c1: '#dc0000', c2: '#ffffff' }
  ];

  player: any = { health: 100, tireWear: 1.0, lap: 5, speed: 0 };
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
      steeringAngle: 0, tireWear: 1.0, health: 100
    };
    this.aiCars = this.teams.slice(1).map((team, i) => ({
      id: i + 1, x: track.waypoints[0].x - 60, y: track.waypoints[0].y + (i+1)*40, 
      angle: 0, speed: 0, lap: 0, targetWP: 1, c1: team.c1, c2: team.c2, health: 100
    }));
    this.gamePhase = 'start';
    this.countdown = 3;
    this.lastTime = performance.now();
  }

  onTrackChange(event: any) { this.currentTrackIndex = +event.target.value; this.resetGame(); }

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
    const accel = 600, friction = 0.98, turn = 3.5;
    if (input.ArrowUp || input.w) car.speed += accel * dt;
    if (input.ArrowDown || input.s) car.speed -= accel * dt * 0.7;
    car.speed *= friction;
    if (Math.abs(car.speed) > 10) {
      if (input.ArrowLeft || input.a) car.angle -= turn * dt * (car.speed / 400);
      if (input.ArrowRight || input.d) car.angle += turn * dt * (car.speed / 400);
    }
    const nextX = car.x + Math.cos(car.angle) * car.speed * dt;
    const nextY = car.y + Math.sin(car.angle) * car.speed * dt;
    if (this.onTrack(nextX, nextY)) { car.x = nextX; car.y = nextY; }
    else { car.speed *= -0.5; car.health -= 2; }
    car.tireWear -= Math.abs(car.speed) * 0.000005;
  }

  private onTrack(x: number, y: number): boolean {
    const t = this.tracks[this.currentTrackIndex];
    for (let i=0; i<t.waypoints.length; i++) {
        if (this.distToSeg({x,y}, t.waypoints[i], t.waypoints[(i+1)%t.waypoints.length]) < this.trackWidth/2 - 5) return true;
    }
    return false;
  }

  private updateAI(car: any, dt: number) {
    const track = this.tracks[this.currentTrackIndex];
    const target = track.waypoints[car.targetWP];
    const dx = target.x - car.x, dy = target.y - car.y;
    if (Math.sqrt(dx*dx+dy*dy) < 120) car.targetWP = (car.targetWP + 1) % track.waypoints.length;
    car.angle += (Math.atan2(dy, dx) - car.angle) * 3 * dt;
    car.speed = 340;
    car.x += Math.cos(car.angle)*car.speed*dt;
    car.y += Math.sin(car.angle)*car.speed*dt;
  }

  private checkCollisions() {
    this.aiCars.forEach(ai => {
      const dx = this.player.x - ai.x, dy = this.player.y - ai.y;
      if (Math.sqrt(dx*dx+dy*dy) < 45) { this.player.speed *= -0.7; this.player.health -= 5; ai.speed *= -0.7; }
    });
  }

  private draw() {
    this.ctx.fillStyle = '#111'; this.ctx.fillRect(0,0,1400,750);
    this.drawTrack();
    this.drawF1Car(this.player, '#fff', '#00d2ff', true);
    this.aiCars.forEach(ai => this.drawF1Car(ai, ai.c1, ai.c2, false));
  }

  private drawTrack() {
    const t = this.tracks[this.currentTrackIndex];
    this.ctx.lineJoin = 'round'; this.ctx.lineCap = 'round';
    // Grass
    this.ctx.strokeStyle = '#0a220a'; this.ctx.lineWidth = this.trackWidth + 60; this.ctx.beginPath();
    this.ctx.moveTo(t.waypoints[0].x, t.waypoints[0].y); t.waypoints.forEach(w => this.ctx.lineTo(w.x,w.y));
    this.ctx.closePath(); this.ctx.stroke();
    // Curbs
    this.ctx.strokeStyle = '#ff003c'; this.ctx.lineWidth = this.trackWidth + 10; this.ctx.stroke();
    // Road
    this.ctx.strokeStyle = '#222'; this.ctx.lineWidth = this.trackWidth; this.ctx.stroke();
    // Line
    this.ctx.strokeStyle = 'rgba(255,255,255,0.1)'; this.ctx.setLineDash([30,30]); this.ctx.lineWidth = 2; this.ctx.stroke(); this.ctx.setLineDash([]);
  }

  private drawF1Car(car: any, c1: string, c2: string, isP: boolean) {
    this.ctx.save(); this.ctx.translate(car.x, car.y); this.ctx.rotate(car.angle);
    this.ctx.fillStyle = c1; if(isP) { this.ctx.shadowBlur=15; this.ctx.shadowColor=c2; }
    this.ctx.beginPath(); this.ctx.moveTo(35,0); this.ctx.lineTo(10,8); this.ctx.lineTo(-20,12); this.ctx.lineTo(-25,0); this.ctx.lineTo(-20,-12); this.ctx.lineTo(10,-8); this.ctx.closePath(); this.ctx.fill();
    this.ctx.fillStyle = c2; this.ctx.fillRect(-10,-10,15,20);
    this.ctx.fillStyle = '#000'; this.ctx.fillRect(25,-14,8,28); this.ctx.fillRect(-30,-15,10,30);
    this.ctx.font = '8px Orbitron'; this.ctx.fillStyle = '#fff'; this.ctx.fillText(isP ? 'P1' : 'AI', -5, 3);
    this.ctx.restore();
  }

  private distToSeg(p: any, v: any, w: any) {
    const l2 = (v.x-w.x)**2 + (v.y-w.y)**2; if(l2===0) return Math.sqrt((p.x-v.x)**2+(p.y-v.y)**2);
    let t = ((p.x-v.x)*(w.x-v.x)+(p.y-v.y)*(w.y-v.y))/l2; t=Math.max(0,Math.min(1,t));
    return Math.sqrt((p.x-(v.x+t*(w.x-v.x)))**2+(p.y-(v.y+t*(w.y-v.y)))**2);
  }
}
