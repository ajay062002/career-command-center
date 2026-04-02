import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
  ],
  template: `
    <div class="app-shell">
      <mat-toolbar class="top-toolbar">
        <span class="logo-icon">⚡</span>
        <span class="app-title">Career Command Center</span>
        <span class="spacer"></span>
        <span class="status-dot"></span>
        <span class="status-text">Backend Live</span>
      </mat-toolbar>

      <mat-sidenav-container class="sidenav-container">
        <mat-sidenav mode="side" opened class="sidenav">
          <mat-nav-list>
            @for (item of navItems; track item.route) {
              <a mat-list-item
                 [routerLink]="item.route"
                 routerLinkActive="active-link"
                 class="nav-item">
                <mat-icon matListItemIcon class="material-symbols-rounded">{{ item.icon }}</mat-icon>
                <span matListItemTitle>{{ item.label }}</span>
              </a>
            }
          </mat-nav-list>
        </mat-sidenav>

        <mat-sidenav-content class="main-content">
          <router-outlet></router-outlet>
        </mat-sidenav-content>
      </mat-sidenav-container>
    </div>
  `,
  styles: [`
    .app-shell { display: flex; flex-direction: column; height: 100vh; background: #f8fafc; }

    .top-toolbar {
      background: rgba(255, 255, 255, 0.8) !important;
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(226, 232, 240, 0.5) !important;
      z-index: 100;
      color: #0f172a !important;
      height: 72px !important;
      padding: 0 40px !important;
    }

    .logo-icon { font-size: 1.5rem; margin-right: 12px; filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.3)); }
    .app-title { font-size: 1.125rem; font-weight: 800; color: #0f172a; font-family: 'Outfit', sans-serif; letter-spacing: -0.025em; }

    .spacer { flex: 1; }

    .status-dot {
      width: 10px; height: 10px; border-radius: 50%;
      background: #10b981; margin-right: 12px;
      box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
      animation: pulse-green 2s infinite;
    }
    @keyframes pulse-green { 0% { transform: scale(1); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }

    .status-text { font-size: 0.75rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }

    .sidenav-container { flex: 1; overflow: hidden; background: transparent; }

    .sidenav {
      width: 280px;
      background: rgba(255, 255, 255, 0.5) !important;
      backdrop-filter: blur(8px);
      border-right: 1px solid rgba(226, 232, 240, 0.5) !important;
      padding-top: 24px;
    }

    .nav-item {
      border-radius: 12px !important;
      margin: 4px 20px !important;
      color: #64748b !important;
      font-weight: 700 !important;
      font-size: 0.875rem !important;
      height: 52px !important;
      display: flex !important;
      align-items: center !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }

    .nav-item:hover { background: rgba(241, 245, 249, 0.8) !important; color: #0f172a !important; transform: translateX(4px); }

    :host ::ng-deep .active-link {
      background: white !important;
      color: #6366f1 !important;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.12) !important;
      transform: translateX(8px) !important;
    }

    :host ::ng-deep .active-link mat-icon { color: #6366f1 !important; font-variation-settings: 'FILL' 1; }

    .main-content { background: transparent; padding: 0; overflow-y: auto; scroll-behavior: smooth; }
  `]
})
export class MainLayoutComponent {
  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'space_dashboard', route: 'dashboard' },
    { label: 'Jobs', icon: 'work', route: 'jobs' },
    { label: 'RTR', icon: 'draw', route: 'rtr' },
    { label: 'Submissions', icon: 'send', route: 'submissions' },
    { label: 'Learning Modules', icon: 'neurology', route: 'study' },
    { label: 'Reminders', icon: 'notifications_active', route: 'reminders' },
    { label: 'Analytics', icon: 'monitoring', route: 'analytics' },
    { label: 'Resume Profile', icon: 'person_edit', route: 'resume-profile' },
  ];
}
