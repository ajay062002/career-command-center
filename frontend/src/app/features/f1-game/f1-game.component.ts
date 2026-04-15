import { Component, ElementRef, HostListener, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

/* ═══════════════════════════════════════════════════════
   LEGO F1 GRAND PRIX
   Brick-built cars, stud-pattern track, classic Lego palette
   ═══════════════════════════════════════════════════════ */

@Component({
  selector: 'app-f1-game',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="lego-world">

  <!-- ── HUD Bar ─────────────────────────────────────────── -->
  <div class="lego-hud">
    <div class="hud-brick hud-brand">
      <span class="stud"></span>
      <span class="stud"></span>
      <span class="brand-text">🟥 LEGO F1</span>
    </div>

    <div class="hud-stats">
      <div class="hud-tile">
        <div class="tile-label">LAP</div>
        <div class="tile-val">{{ (player?.lap || 0) + 1 }} / {{ totalLaps }}</div>
      </div>
      <div class="hud-tile">
        <div class="tile-label">SPEED</div>
        <div class="tile-val">{{ math.round(player?.speed || 0) }}<span>km/h</span></div>
      </div>
      <div class="hud-tile">
        <div class="tile-label">POS</div>
        <div class="tile-val lego-red">P{{ position }}</div>
      </div>
    </div>

    <div class="hud-controls">
      <select (change)="onTrackChange($event)" class="lego-select">
        <option *ngFor="let t of tracks; let i = index" [value]="i">{{ t.name }}</option>
      </select>
      <button class="lego-btn lego-btn--red" (click)="resetGame()">
        ↺ RESTART
      </button>
    </div>
  </div>

  <!-- ── Canvas ──────────────────────────────────────────── -->
  <div class="canvas-wrap">
    <canvas #gameCanvas width="1280" height="640"></canvas>

    <!-- countdown overlay -->
    <div class="lego-overlay" *ngIf="gamePhase === 'start'">
      <div class="lego-lights">
        <div class="brick-light" [class.on-red]="countdown > 2"></div>
        <div class="brick-light" [class.on-red]="countdown > 1"></div>
        <div class="brick-light" [class.on-red]="countdown > 0 && countdown <= 1"></div>
        <div class="brick-light" [class.on-green]="countdown <= 0"></div>
      </div>
      <div class="countdown-num">{{ countdown > 0 ? math.ceil(countdown) : 'GO!' }}</div>
    </div>

    <!-- finish overlay -->
    <div class="lego-overlay finish-overlay" *ngIf="gamePhase === 'finished'">
      <div class="finish-brick">
        <div class="finish-studs">
          <span class="stud" *ngFor="let s of [1,2,3,4,5,6]"></span>
        </div>
        <div class="trophy">🏆</div>
        <div class="finish-title">CHECKERED!</div>
        <div class="finish-sub">+25 LEGO POINTS</div>
        <button class="lego-btn lego-btn--yellow" (click)="resetGame()">NEXT CIRCUIT</button>
      </div>
    </div>
  </div>

  <!-- ── Gauges ───────────────────────────────────────────── -->
  <div class="lego-gauges">
    <div class="gauge-brick gauge-brick--red">
      <div class="gauge-studs"><span class="stud"></span><span class="stud"></span></div>
      <div class="gauge-label">HULL</div>
      <div class="gauge-bar">
        <div class="gauge-fill" [style.width.%]="player?.health || 0"
             [style.background]="(player?.health || 0) > 50 ? '#00A650' : '#E3000B'"></div>
      </div>
      <div class="gauge-val">{{ player?.health || 0 }}%</div>
    </div>

    <div class="gauge-brick gauge-brick--blue">
      <div class="gauge-studs"><span class="stud"></span><span class="stud"></span></div>
      <div class="gauge-label">TYRES</div>
      <div class="gauge-bar">
        <div class="gauge-fill" [style.width.%]="(player?.tireWear || 0) * 100"
             [style.background]="(player?.tireWear || 0) > 0.4 ? '#F2CD37' : '#E3000B'"></div>
      </div>
      <div class="gauge-val">{{ math.round((player?.tireWear || 0) * 100) }}%</div>
    </div>

    <div class="gauge-brick gauge-brick--yellow">
      <div class="gauge-studs"><span class="stud"></span><span class="stud"></span></div>
      <div class="gauge-label">RADIO</div>
      <div class="radio-msg">{{ radioMsg }}</div>
    </div>

    <div class="gauge-brick gauge-brick--green controls-hint">
      <div class="gauge-studs"><span class="stud"></span><span class="stud"></span></div>
      <div class="gauge-label">CONTROLS</div>
      <div class="hint-grid">
        <span>↑ / W</span><span>Accelerate</span>
        <span>↓ / S</span><span>Brake</span>
        <span>← / →</span><span>Steer</span>
      </div>
    </div>
  </div>

</div>
  `,
  styles: [`
    /* ── LEGO colour palette ─────────────────────────── */
    :host {
      --lego-red:    #E3000B;
      --lego-yellow: #F2CD37;
      --lego-blue:   #006CB7;
      --lego-green:  #00A650;
      --lego-orange: #FF6600;
      --lego-white:  #F5F5F5;
      --lego-black:  #1C1C1C;
      --lego-grey:   #9BA19D;
      --lego-dk-grey:#6C6E68;
      --lego-sky:    #87CEEB;
      --stud-size:   10px;
      --brick-radius:3px;
      --font: 'Press Start 2P', 'Courier New', monospace;
    }

    .lego-world {
      width: 100%;
      height: 100vh;
      display: flex;
      flex-direction: column;
      background:
        linear-gradient(180deg,
          #5BA4CF 0%, #87CEEB 35%,
          #88CC44 35%, #6AAA2A 42%,
          #5C3A1E 42%, #2E2A1E 100%
        );
      font-family: var(--font);
      padding: 12px;
      box-sizing: border-box;
      gap: 10px;
      overflow: hidden;
    }

    /* ── HUD ─────────────────────────────────────────── */
    .lego-hud {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      background: var(--lego-black);
      border: 4px solid #000;
      border-radius: var(--brick-radius);
      box-shadow:
        inset -3px -3px 0 rgba(0,0,0,0.7),
        inset 3px 3px 0 rgba(255,255,255,0.12),
        0 6px 0 #000;
      padding: 10px 20px;
      flex-shrink: 0;
    }

    .hud-brick {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .stud {
      display: inline-block;
      width: var(--stud-size);
      height: var(--stud-size);
      border-radius: 50%;
      background: rgba(255,255,255,0.18);
      border: 1px solid rgba(255,255,255,0.08);
      flex-shrink: 0;
    }

    .brand-text {
      font-size: 0.65rem;
      color: var(--lego-yellow);
      text-shadow: 2px 2px 0 #000;
      letter-spacing: 1px;
    }

    .hud-stats {
      display: flex;
      gap: 24px;
    }

    .hud-tile {
      text-align: center;
    }
    .tile-label {
      font-size: 0.28rem;
      color: var(--lego-grey);
      letter-spacing: 2px;
      margin-bottom: 3px;
    }
    .tile-val {
      font-size: 0.75rem;
      color: #fff;
      text-shadow: 2px 2px 0 #000;
    }
    .tile-val span { font-size: 0.35rem; color: var(--lego-grey); margin-left: 2px; }
    .lego-red { color: var(--lego-red) !important; }

    .hud-controls {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    .lego-select {
      background: #2a2a2a;
      color: var(--lego-yellow);
      border: 3px solid #000;
      border-radius: var(--brick-radius);
      padding: 6px 10px;
      font-family: var(--font);
      font-size: 0.35rem;
      outline: none;
      box-shadow: inset 2px 2px 0 rgba(0,0,0,0.5);
    }

    /* ── Lego Buttons ─────────────────────────────────── */
    .lego-btn {
      font-family: var(--font);
      font-size: 0.38rem;
      border: 3px solid #000;
      border-radius: var(--brick-radius);
      padding: 8px 16px;
      cursor: pointer;
      letter-spacing: 0.5px;
      transition: transform 0.08s ease, box-shadow 0.08s ease;
      text-shadow: 1px 1px 0 rgba(0,0,0,0.6);
    }
    .lego-btn--red {
      background: var(--lego-red);
      color: #fff;
      box-shadow: 0 5px 0 #8B0000, inset -2px -2px 0 rgba(0,0,0,0.3), inset 2px 2px 0 rgba(255,150,150,0.2);
      &:hover { transform: translateY(2px); box-shadow: 0 3px 0 #8B0000; }
      &:active { transform: translateY(5px); box-shadow: 0 0 0 #8B0000; }
    }
    .lego-btn--yellow {
      background: var(--lego-yellow);
      color: #000;
      text-shadow: none;
      box-shadow: 0 5px 0 #8B7000, inset -2px -2px 0 rgba(0,0,0,0.2), inset 2px 2px 0 rgba(255,255,200,0.3);
      &:hover { transform: translateY(2px); box-shadow: 0 3px 0 #8B7000; }
      &:active { transform: translateY(5px); box-shadow: 0 0 0 #8B7000; }
    }

    /* ── Canvas ───────────────────────────────────────── */
    .canvas-wrap {
      position: relative;
      flex: 1;
      border: 4px solid #000;
      border-radius: var(--brick-radius);
      overflow: hidden;
      box-shadow: 0 8px 0 #000, inset -4px -4px 0 rgba(0,0,0,0.5);
      min-height: 0;
    }

    canvas {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    /* ── Overlays ─────────────────────────────────────── */
    .lego-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.55);
      gap: 20px;
      z-index: 10;
    }

    .lego-lights {
      display: flex;
      gap: 12px;
    }
    .brick-light {
      width: 36px; height: 36px;
      background: #333;
      border: 3px solid #000;
      border-radius: var(--brick-radius);
      box-shadow: inset 2px 2px 0 rgba(255,255,255,0.1);
      transition: all 0.2s;
    }
    .brick-light.on-red {
      background: var(--lego-red);
      box-shadow: 0 0 20px var(--lego-red), inset 2px 2px 0 rgba(255,150,150,0.3);
    }
    .brick-light.on-green {
      background: var(--lego-green);
      box-shadow: 0 0 20px var(--lego-green), inset 2px 2px 0 rgba(150,255,150,0.3);
    }

    .countdown-num {
      font-size: 5rem;
      color: #fff;
      text-shadow: 4px 4px 0 #000, 0 0 30px rgba(255,255,255,0.4);
      line-height: 1;
    }

    .finish-overlay { pointer-events: auto; }
    .finish-brick {
      background: var(--lego-yellow);
      border: 4px solid #000;
      border-radius: var(--brick-radius);
      padding: 30px 50px;
      text-align: center;
      box-shadow: 0 10px 0 #8B7000, inset -3px -3px 0 rgba(0,0,0,0.3), inset 3px 3px 0 rgba(255,255,200,0.4);
    }
    .finish-studs {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-bottom: 16px;
    }
    .finish-studs .stud {
      width: 14px; height: 14px;
      background: rgba(0,0,0,0.2);
    }
    .trophy { font-size: 3rem; }
    .finish-title {
      font-size: 1rem;
      color: #000;
      text-shadow: 2px 2px 0 rgba(0,0,0,0.2);
      margin: 8px 0 4px;
    }
    .finish-sub {
      font-size: 0.45rem;
      color: rgba(0,0,0,0.6);
      margin-bottom: 20px;
    }

    /* ── Gauges ───────────────────────────────────────── */
    .lego-gauges {
      display: flex;
      gap: 10px;
      flex-shrink: 0;
    }

    .gauge-brick {
      flex: 1;
      border: 4px solid #000;
      border-radius: var(--brick-radius);
      padding: 8px 12px;
      box-shadow:
        inset -3px -3px 0 rgba(0,0,0,0.5),
        inset 3px 3px 0 rgba(255,255,255,0.15),
        0 5px 0 #000;
      position: relative;
    }
    .gauge-brick--red    { background: #3a0a0a; }
    .gauge-brick--blue   { background: #0a1a3a; }
    .gauge-brick--yellow { background: #3a2a00; }
    .gauge-brick--green  { background: #0a2a0a; }

    .gauge-studs {
      display: flex;
      gap: 4px;
      margin-bottom: 6px;
    }

    .gauge-label {
      font-size: 0.3rem;
      color: rgba(255,255,255,0.5);
      letter-spacing: 2px;
      margin-bottom: 6px;
    }

    .gauge-bar {
      height: 8px;
      background: #000;
      border: 2px solid rgba(255,255,255,0.1);
      overflow: hidden;
      border-radius: 0;
      margin-bottom: 4px;
    }
    .gauge-fill {
      height: 100%;
      transition: width 0.3s ease, background 0.5s ease;
    }
    .gauge-val {
      font-size: 0.45rem;
      color: #fff;
      text-align: right;
      text-shadow: 1px 1px 0 #000;
    }

    .radio-msg {
      font-size: 0.3rem;
      color: var(--lego-yellow);
      line-height: 1.8;
      text-shadow: 1px 1px 0 #000;
      margin-top: 4px;
    }

    .hint-grid {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 2px 10px;
      font-size: 0.28rem;
      color: rgba(255,255,255,0.6);
    }
    .hint-grid span:nth-child(odd) { color: var(--lego-green); }
  `]
})
export class F1GameComponent implements AfterViewInit, OnDestroy {
  @ViewChild('gameCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private animationId!: number;
  math = Math;

  totalLaps = 3;
  trackWidth = 140;
  position = 1;

  /* ── Lego team colours ─────────────────────────────── */
  teams = [
    { name: 'PLAYER',   brick: '#E3000B', accent: '#F2CD37', wheel: '#1C1C1C' },
    { name: 'STUDIO 2', brick: '#006CB7', accent: '#F5F5F5', wheel: '#1C1C1C' },
    { name: 'STUDIO 3', brick: '#00A650', accent: '#F2CD37', wheel: '#1C1C1C' },
    { name: 'STUDIO 4', brick: '#FF6600', accent: '#F5F5F5', wheel: '#1C1C1C' },
  ];

  tracks = [
    {
      name: 'LEGO CITY GP',
      waypoints: [
        {x:160, y:130}, {x:1100, y:130}, {x:1180, y:210},
        {x:1180, y:510}, {x:1100, y:590}, {x:700, y:590},
        {x:700, y:420}, {x:500, y:420}, {x:500, y:590},
        {x:160, y:590}, {x:80, y:510}, {x:80, y:210}, {x:160, y:130}
      ],
      baseColor: '#4A7C2F', studColor: '#5A8C3F'
    },
    {
      name: 'BRICK STREET CIRCUIT',
      waypoints: [
        {x:200, y:180}, {x:650, y:100}, {x:1100, y:200},
        {x:1150, y:420}, {x:950, y:560}, {x:600, y:480},
        {x:350, y:560}, {x:120, y:440}, {x:200, y:180}
      ],
      baseColor: '#3A5C1E', studColor: '#4A6C2E'
    }
  ];
  currentTrackIndex = 0;

  player: any = null;
  aiCars: any[] = [];
  gamePhase: 'start' | 'racing' | 'finished' = 'start';
  countdown = 3;
  lastTime = 0;
  radioMsg = '"Push push push! Brick by brick!"';

  private keys: Record<string, boolean> = {};
  private radioMsgs = [
    '"Push push push! Brick by brick!"',
    '"Box box — new tyres from the factory!"',
    '"Gap is 1.2 seconds. Build the gap!"',
    '"Watch the kerbs — they are LEGO studded!"',
    '"P1! P1! Yellow brick road is yours!"',
  ];
  private radioTimer = 0;

  constructor() { this.resetGame(); }

  ngAfterViewInit() {
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.startGameLoop();
  }
  ngOnDestroy() { cancelAnimationFrame(this.animationId); }

  @HostListener('window:keydown', ['$event']) onKD(e: KeyboardEvent) {
    this.keys[e.key] = true; e.preventDefault();
  }
  @HostListener('window:keyup', ['$event']) onKU(e: KeyboardEvent) {
    this.keys[e.key] = false;
  }

  onTrackChange(e: any) { this.currentTrackIndex = +e.target.value; this.resetGame(); }

  resetGame() {
    const t = this.tracks[this.currentTrackIndex];
    const start = t.waypoints[0];
    this.player = {
      x: start.x, y: start.y + 20, angle: 0,
      speed: 0, lap: 0, tireWear: 1.0, health: 100,
      targetWP: 1, team: this.teams[0]
    };
    this.aiCars = this.teams.slice(1).map((team, i) => ({
      x: start.x - 50, y: start.y + (i + 1) * 35,
      angle: 0, speed: 0, lap: 0, targetWP: 1,
      health: 100, team
    }));
    this.gamePhase = 'start';
    this.countdown = 3;
    this.lastTime = performance.now();
    this.position = 1;
  }

  private startGameLoop() {
    const loop = (t: number) => {
      const dt = Math.min((t - this.lastTime) / 1000, 0.05);
      this.lastTime = t;
      this.update(dt);
      this.render();
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

    this.updatePlayer(dt);
    this.aiCars.forEach(ai => this.updateAI(ai, dt));
    this.checkCollisions();
    this.updatePosition();

    this.radioTimer += dt;
    if (this.radioTimer > 8) {
      this.radioTimer = 0;
      this.radioMsg = this.radioMsgs[Math.floor(Math.random() * this.radioMsgs.length)];
    }
  }

  private updatePlayer(dt: number) {
    const accel = 520, friction = 0.97, turnRate = 3.2;
    const car = this.player;
    if (this.keys['ArrowUp'] || this.keys['w']) car.speed += accel * dt;
    if (this.keys['ArrowDown'] || this.keys['s']) car.speed -= accel * dt * 0.6;
    car.speed *= friction;
    car.speed = Math.max(-120, Math.min(520, car.speed));
    if (Math.abs(car.speed) > 8) {
      if (this.keys['ArrowLeft'] || this.keys['a']) car.angle -= turnRate * dt * Math.sign(car.speed);
      if (this.keys['ArrowRight'] || this.keys['d']) car.angle += turnRate * dt * Math.sign(car.speed);
    }
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    if (this.onTrack(nx, ny)) { car.x = nx; car.y = ny; }
    else { car.speed *= -0.4; car.health = Math.max(0, car.health - 1.5); }
    car.tireWear = Math.max(0, car.tireWear - Math.abs(car.speed) * 0.000004);
    this.checkLapCompletion(car, true);
  }

  private updateAI(car: any, dt: number) {
    const t = this.tracks[this.currentTrackIndex];
    const target = t.waypoints[car.targetWP];
    const dx = target.x - car.x, dy = target.y - car.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 100) car.targetWP = (car.targetWP + 1) % t.waypoints.length;
    const targetAngle = Math.atan2(dy, dx);
    let da = targetAngle - car.angle;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    car.angle += da * 4 * dt;
    car.speed = 280 + Math.random() * 40;
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    this.checkLapCompletion(car, false);
  }

  private checkLapCompletion(car: any, isPlayer: boolean) {
    const t = this.tracks[this.currentTrackIndex];
    const start = t.waypoints[0];
    const dx = car.x - start.x, dy = car.y - start.y;
    if (Math.sqrt(dx * dx + dy * dy) < 60 && car.targetWP > t.waypoints.length - 3) {
      car.lap++;
      car.targetWP = 1;
      if (isPlayer && car.lap >= this.totalLaps) {
        this.gamePhase = 'finished';
      }
    }
  }

  private checkCollisions() {
    this.aiCars.forEach(ai => {
      const dx = this.player.x - ai.x, dy = this.player.y - ai.y;
      if (Math.sqrt(dx * dx + dy * dy) < 40) {
        this.player.speed *= -0.5;
        this.player.health = Math.max(0, this.player.health - 4);
      }
    });
  }

  private updatePosition() {
    const allLaps = [this.player, ...this.aiCars].map(c => c.lap);
    this.position = allLaps.filter(l => l > this.player.lap).length + 1;
  }

  private onTrack(x: number, y: number): boolean {
    const t = this.tracks[this.currentTrackIndex];
    for (let i = 0; i < t.waypoints.length - 1; i++) {
      if (this.distToSeg({ x, y }, t.waypoints[i], t.waypoints[i + 1]) < this.trackWidth / 2 - 4) return true;
    }
    return false;
  }

  /* ── RENDERING ─────────────────────────────────────── */
  private render() {
    const c = this.ctx;
    const W = 1280, H = 640;

    // Sky/ground Lego background
    const grd = c.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, '#87CEEB');
    grd.addColorStop(0.45, '#6BB8D8');
    c.fillStyle = grd;
    c.fillRect(0, 0, W, H);

    this.drawLegoBaseplate(c, W, H);
    this.drawTrack(c);
    this.drawLegoCar(c, this.player, true);
    this.aiCars.forEach(ai => this.drawLegoCar(c, ai, false));
    this.drawHudOverlay(c);
  }

  private drawLegoBaseplate(c: CanvasRenderingContext2D, W: number, H: number) {
    const t = this.tracks[this.currentTrackIndex];
    // Green baseplate
    c.fillStyle = t.baseColor;
    c.fillRect(0, H * 0.42, W, H);
    // Stud grid dots
    c.fillStyle = t.studColor;
    const gap = 28;
    for (let x = gap / 2; x < W; x += gap) {
      for (let y = H * 0.42 + gap / 2; y < H; y += gap) {
        c.beginPath();
        c.arc(x, y, 4, 0, Math.PI * 2);
        c.fill();
      }
    }
  }

  private drawTrack(c: CanvasRenderingContext2D) {
    const t = this.tracks[this.currentTrackIndex];
    const wps = t.waypoints;
    c.lineJoin = 'round'; c.lineCap = 'round';

    // Red/white Lego curb border
    c.strokeStyle = '#E3000B';
    c.lineWidth = this.trackWidth + 18;
    c.setLineDash([24, 24]);
    c.beginPath();
    c.moveTo(wps[0].x, wps[0].y);
    wps.forEach(w => c.lineTo(w.x, w.y));
    c.closePath(); c.stroke();

    // White curb stripe
    c.strokeStyle = '#F5F5F5';
    c.lineWidth = this.trackWidth + 18;
    c.setLineDash([24, 24]);
    c.lineDashOffset = 24;
    c.stroke();
    c.setLineDash([]); c.lineDashOffset = 0;

    // Grey asphalt road
    c.strokeStyle = '#6C6E68';
    c.lineWidth = this.trackWidth;
    c.beginPath();
    c.moveTo(wps[0].x, wps[0].y);
    wps.forEach(w => c.lineTo(w.x, w.y));
    c.closePath(); c.stroke();

    // Lego stud pattern on road surface
    c.strokeStyle = '#5C5E58';
    c.lineWidth = this.trackWidth - 20;
    c.stroke();

    // Centre dashes — yellow Lego stripe
    c.strokeStyle = '#F2CD37';
    c.lineWidth = 3;
    c.setLineDash([20, 16]);
    c.beginPath();
    c.moveTo(wps[0].x, wps[0].y);
    wps.forEach(w => c.lineTo(w.x, w.y));
    c.closePath(); c.stroke();
    c.setLineDash([]);

    // Start/finish line
    this.drawStartLine(c, wps[0]);
  }

  private drawStartLine(c: CanvasRenderingContext2D, pos: { x: number; y: number }) {
    c.save();
    // Checkered start/finish
    const size = 10;
    for (let i = -4; i < 4; i++) {
      for (let j = -1; j < 2; j++) {
        c.fillStyle = (i + j) % 2 === 0 ? '#fff' : '#000';
        c.fillRect(pos.x + i * size - 5, pos.y + j * size - size / 2, size, size);
      }
    }
    c.restore();
  }

  /* ── LEGO brick car ────────────────────────────────── */
  private drawLegoCar(c: CanvasRenderingContext2D, car: any, isPlayer: boolean) {
    c.save();
    c.translate(car.x, car.y);
    c.rotate(car.angle);

    const team = car.team;
    const W = 40, H = 20;

    // Glow for player
    if (isPlayer) {
      c.shadowColor = team.brick;
      c.shadowBlur = 12;
    }

    // Main brick body
    c.fillStyle = team.brick;
    c.strokeStyle = '#000';
    c.lineWidth = 2;
    c.beginPath();
    c.roundRect(-W / 2, -H / 2, W, H, 2);
    c.fill(); c.stroke();

    // Accent stripe (cockpit area)
    c.fillStyle = team.accent;
    c.beginPath();
    c.roundRect(-6, -H / 2 + 3, 16, H - 6, 1);
    c.fill(); c.stroke();

    // Lego studs on top of car (2 studs)
    c.fillStyle = this.lighten(team.brick, 30);
    c.strokeStyle = '#000';
    c.lineWidth = 1.5;
    [-8, 8].forEach(sx => {
      c.beginPath();
      c.arc(sx, -H / 2 - 3, 4, 0, Math.PI * 2);
      c.fill(); c.stroke();
    });

    // Wheels — black Lego tyres with grey hubcap
    [[W / 2 - 8, H / 2 + 1], [-W / 2 + 8, H / 2 + 1],
     [W / 2 - 8, -H / 2 - 1], [-W / 2 + 8, -H / 2 - 1]].forEach(([wx, wy]) => {
      c.fillStyle = team.wheel;
      c.beginPath();
      c.arc(wx, wy, 7, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#000'; c.lineWidth = 1.5; c.stroke();
      // Hub cap
      c.fillStyle = '#9BA19D';
      c.beginPath();
      c.arc(wx, wy, 3, 0, Math.PI * 2);
      c.fill();
    });

    // Driver minifig head (yellow circle)
    c.fillStyle = '#F2CD37';
    c.strokeStyle = '#000';
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(0, 0, 6, 0, Math.PI * 2);
    c.fill(); c.stroke();
    // Face dots
    c.fillStyle = '#000';
    c.beginPath(); c.arc(-2, -1, 1, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(2, -1, 1, 0, Math.PI * 2); c.fill();

    // "P1" / team label
    c.font = 'bold 7px monospace';
    c.fillStyle = '#fff';
    c.textAlign = 'center';
    c.fillText(isPlayer ? 'P1' : car.team.name.substring(0, 2), 0, H / 2 + 16);

    c.shadowBlur = 0;
    c.restore();
  }

  private drawHudOverlay(c: CanvasRenderingContext2D) {
    // Mini position leaderboard in top-left
    c.save();
    c.fillStyle = 'rgba(0,0,0,0.6)';
    c.fillRect(10, 10, 110, 90);
    c.strokeStyle = '#F2CD37';
    c.lineWidth = 2;
    c.strokeRect(10, 10, 110, 90);
    c.font = 'bold 8px monospace';
    c.fillStyle = '#F2CD37';
    c.fillText('LEADERBOARD', 16, 26);
    const allCars = [{ ...this.player, isP: true }, ...this.aiCars.map(a => ({ ...a, isP: false }))];
    allCars.sort((a, b) => b.lap - a.lap);
    allCars.slice(0, 4).forEach((car, i) => {
      c.fillStyle = car.isP ? '#E3000B' : '#fff';
      c.fillText(`P${i + 1} ${car.isP ? 'YOU' : car.team?.name?.substring(0, 3) ?? 'AI'}`, 16, 44 + i * 14);
    });
    c.restore();
  }

  private lighten(hex: string, amount: number): string {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (n >> 16) + amount);
    const g = Math.min(255, ((n >> 8) & 0xff) + amount);
    const b = Math.min(255, (n & 0xff) + amount);
    return `rgb(${r},${g},${b})`;
  }

  private distToSeg(p: { x: number; y: number }, v: { x: number; y: number }, w: { x: number; y: number }): number {
    const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2 === 0) return Math.sqrt((p.x - v.x) ** 2 + (p.y - v.y) ** 2);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.sqrt((p.x - (v.x + t * (w.x - v.x))) ** 2 + (p.y - (v.y + t * (w.y - v.y))) ** 2);
  }
}
