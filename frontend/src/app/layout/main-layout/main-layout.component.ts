import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  @ViewChild('sidenav') sidenav!: MatSidenav;

  isMobile = false;
  sidenavOpened = true;
  sidenavMode: 'side' | 'over' = 'side';

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router,
    private breakpointObserver: BreakpointObserver
  ) { }

  ngOnInit(): void {
    this.breakpointObserver.observe(['(max-width: 768px)'])
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        this.isMobile = result.matches;
        this.sidenavMode = this.isMobile ? 'over' : 'side';
        this.sidenavOpened = !this.isMobile;
      });

    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (this.isMobile && this.sidenav?.opened) {
        this.sidenav.close();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  isAdmin(): boolean { return this.authService.isAdmin(); }

  get currentUser(): any { return this.authService.getCurrentUser() || {}; }

  get userInitials(): string {
    const u = this.currentUser;
    const name = u.displayName || u.username || 'U';
    return name.substring(0, 2).toUpperCase();
  }

  get userDisplayName(): string {
    const u = this.currentUser;
    return u.displayName || u.username || 'Career Tracker';
  }

  get userRole(): string {
    return this.currentUser?.role === 'ROLE_ADMIN' ? 'Administrator' : 'User';
  }

  get avatarGradient(): string {
    const gradients = [
      'linear-gradient(135deg,#0059B3,#003d87)',
      'linear-gradient(135deg,#FF6B00,#c24f00)',
      'linear-gradient(135deg,#22c55e,#15803d)',
      'linear-gradient(135deg,#a855f7,#7e22ce)',
      'linear-gradient(135deg,#f59e0b,#b45309)',
      'linear-gradient(135deg,#14b8a6,#0f766e)',
    ];
    const code = (this.currentUser?.username || 'U').charCodeAt(0) % gradients.length;
    return gradients[code];
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
