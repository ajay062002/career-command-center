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
    :host { display: block; height: 100%; overflow: hidden; }
    .game-wrapper { width: 100%; height: 100%; background: #000; }
    .game-frame { width: 100%; height: 100%; border: none; display: block; }
  `]
})
export class F1GameComponent {
  gameUrl: SafeResourceUrl;

  constructor(private sanitizer: DomSanitizer) {
    this.gameUrl = this.sanitizer.bypassSecurityTrustResourceUrl('/assets/f1-game/index.html');
  }
}
