import { Component, ElementRef, HostListener, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

/* ═══════════════════════════════════════════════════════
   MINECRAFT GP (3D F1 Engine Restored)
   Physics-based racing with Minecraft pixel-art aesthetic
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
    this.ctx.fillStyle = '#1A1814'; // Canvas wrapper bg (bedrock black)
    this.ctx.fillRect(0,0,1400,750);
    this.drawTrack();
    this.drawF1Car(this.player, '#44E8FF', '#00d2ff', true); // Car body player (diamond blue)
    this.aiCars.forEach(ai => this.drawF1Car(ai, ai.c1, ai.c2, false));
  }

  private drawTrack() {
    const t = this.tracks[this.currentTrackIndex];
    this.ctx.lineJoin = 'round'; this.ctx.lineCap = 'round';
    
    // Stadium Walls
    this.ctx.strokeStyle = '#3A3628'; // MC wood
    this.ctx.lineWidth = this.trackWidth + 80; this.ctx.beginPath();
    this.ctx.moveTo(t.waypoints[0].x, t.waypoints[0].y); t.waypoints.forEach(w => this.ctx.lineTo(w.x,w.y));
    this.ctx.closePath(); this.ctx.stroke();
    // Wall Outlines
    this.ctx.strokeStyle = '#000'; this.ctx.lineWidth = this.trackWidth + 84; this.ctx.stroke();

    // Grass
    this.ctx.strokeStyle = '#6AAA2A'; // Grass runoff (MC grass dark)
    this.ctx.lineWidth = this.trackWidth + 60; this.ctx.beginPath();
    this.ctx.moveTo(t.waypoints[0].x, t.waypoints[0].y); t.waypoints.forEach(w => this.ctx.lineTo(w.x,w.y));
    this.ctx.closePath(); this.ctx.stroke();
    
    // Kerbs (alternating)
    this.ctx.lineWidth = this.trackWidth + 10;
    this.ctx.setLineDash([40, 40]);
    this.ctx.strokeStyle = '#FF2244'; // MC redstone
    this.ctx.stroke();
    this.ctx.strokeStyle = '#F5F0E0'; // MC wool white
    this.ctx.lineDashOffset = 40;
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    this.ctx.lineDashOffset = 0;

    // Road
    this.ctx.strokeStyle = '#2A2620'; // Asphalt (dark MC stone)
    this.ctx.lineWidth = this.trackWidth; this.ctx.stroke();
    
    // Centre line dashes
    this.ctx.strokeStyle = '#FFD020'; // Centre line (MC gold)
    this.ctx.setLineDash([30,30]); this.ctx.lineWidth = 2; this.ctx.stroke(); this.ctx.setLineDash([]);
  }

  private drawF1Car(car: any, c1: string, c2: string, isP: boolean) {
    this.ctx.save(); this.ctx.translate(car.x, car.y); this.ctx.rotate(car.angle);
    this.ctx.fillStyle = c1; 
    if(isP) { 
      this.ctx.shadowBlur=15; 
      this.ctx.shadowColor='#44E8FF'; 
    }
    this.ctx.beginPath(); this.ctx.moveTo(35,0); this.ctx.lineTo(10,8); this.ctx.lineTo(-20,12); this.ctx.lineTo(-25,0); this.ctx.lineTo(-20,-12); this.ctx.lineTo(10,-8); this.ctx.closePath(); this.ctx.fill();
    this.ctx.fillStyle = c2; this.ctx.fillRect(-10,-10,15,20);
    this.ctx.fillStyle = '#000'; this.ctx.fillRect(25,-14,8,28); this.ctx.fillRect(-30,-15,10,30);
    
    this.ctx.font = 'bold 8px "Press Start 2P"'; 
    this.ctx.fillStyle = '#fff'; 
    this.ctx.fillText(isP ? 'P1' : 'AI', -5, 3);
    this.ctx.restore();
  }

  private distToSeg(p: any, v: any, w: any) {
    const l2 = (v.x-w.x)**2 + (v.y-w.y)**2; if(l2===0) return Math.sqrt((p.x-v.x)**2+(p.y-v.y)**2);
    let t = ((p.x-v.x)*(w.x-v.x)+(p.y-v.y)*(w.y-v.y))/l2; t=Math.max(0,Math.min(1,t));
    return Math.sqrt((p.x-(v.x+t*(w.x-v.x)))**2+(p.y-(v.y+t*(w.y-v.y)))**2);
  }
}
