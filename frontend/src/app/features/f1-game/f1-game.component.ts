import { Component } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-f1-game',
  standalone: true,
  template: `
    <div class="game-wrapper">
      <iframe
        [src]="gameUrl"
        class="game-frame"
        allow="autoplay; pointer-lock"
        title="F1 LEGO Racing 3D">
      </iframe>
    </div>
  `,
  styles: [`
    :host { display: block; height: calc(100vh - 64px); overflow: hidden; }
    .game-wrapper { width: 100%; height: 100%; background: #000; }
    .game-frame { width: 100%; height: 100%; border: none; display: block; min-height: 500px; }
  `]
})
export class F1GameComponent {
  gameUrl: SafeResourceUrl;

  constructor(private sanitizer: DomSanitizer) {
    this.gameUrl = this.sanitizer.bypassSecurityTrustResourceUrl('/assets/f1-game/index.html');
  }
}
