import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDividerModule,
  ],
  templateUrl: './profile.component.html',
  styleUrl:    './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  user: any = null;
  summary: any = null;
  loading = true;
  editMode = false;
  saving = false;

  form!: FormGroup;

  /** Avatar gradient palette – pick by first-char code */
  private gradients = [
    ['#0059B3','#003d87'],
    ['#FF6B00','#c24f00'],
    ['#22c55e','#15803d'],
    ['#a855f7','#7e22ce'],
    ['#f59e0b','#b45309'],
    ['#14b8a6','#0f766e'],
    ['#ef4444','#b91c1c'],
    ['#3b82f6','#1d4ed8'],
  ];

  constructor(
    private authService: AuthService,
    private dashboardService: DashboardService,
    private fb: FormBuilder,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser() || {};

    this.form = this.fb.group({
      displayName: [this.user.displayName || this.user.username || '', Validators.required],
      email:       [this.user.email || '', [Validators.email]],
      phone:       [this.user.phone || ''],
      linkedin:    [this.user.linkedin || ''],
      targetRole:  [this.user.targetRole || ''],
      location:    [this.user.location || ''],
      bio:         [this.user.bio || ''],
    });

    this.dashboardService.getDashboardSummary().subscribe({
      next: s => { this.summary = s; this.loading = false; },
      error: ()  => { this.loading = false; }
    });
  }

  get initials(): string {
    const n = this.user?.displayName || this.user?.username || 'U';
    return n.substring(0, 2).toUpperCase();
  }

  get avatarGradient(): string {
    const code = (this.user?.username || 'U').charCodeAt(0) % this.gradients.length;
    return `linear-gradient(135deg, ${this.gradients[code][0]}, ${this.gradients[code][1]})`;
  }

  get roleBadge(): string {
    const r = this.user?.role || '';
    if (r === 'ROLE_ADMIN') return 'Administrator';
    return 'User';
  }

  get isAdmin(): boolean { return this.user?.role === 'ROLE_ADMIN'; }

  get memberSince(): string {
    // Fall back to today if not stored
    const d = this.user?.createdAt ? new Date(this.user.createdAt) : new Date();
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  get(key: string): number { return this.summary?.[key] ?? 0; }

  statCards = [
    { key: 'totalJobs',            label: 'Jobs Tracked',     icon: 'work',                 color: 'blue',   link: '/jobs' },
    { key: 'activeSubmissions',    label: 'Submissions',      icon: 'send',                 color: 'orange', link: '/submissions' },
    { key: 'rtrPending',           label: 'RTRs Active',      icon: 'assignment_turned_in', color: 'purple', link: '/rtr' },
    { key: 'offers',               label: 'Offers',           icon: 'star',                 color: 'green',  link: '/jobs' },
    { key: 'studyMinutesThisWeek', label: 'Study Min (Week)', icon: 'school',               color: 'teal',   link: '/study' },
    { key: 'overdueReminders',     label: 'Overdue',          icon: 'alarm',                color: 'yellow', link: '/reminders' },
  ];

  toggleEdit(): void {
    if (this.editMode) {
      // cancel
      this.form.patchValue({
        displayName: this.user.displayName || this.user.username || '',
        email:       this.user.email || '',
        phone:       this.user.phone || '',
        linkedin:    this.user.linkedin || '',
        targetRole:  this.user.targetRole || '',
        location:    this.user.location || '',
        bio:         this.user.bio || '',
      });
    }
    this.editMode = !this.editMode;
  }

  saveProfile(): void {
    if (this.form.invalid) return;
    this.saving = true;

    // Merge into stored user (client-side only since we have no dedicated profile endpoint)
    const updated = { ...this.user, ...this.form.value };
    localStorage.setItem('currentUser', JSON.stringify(updated));
    this.user = updated;

    this.saving = false;
    this.editMode = false;
    this.snack.open('Profile saved!', 'OK', { duration: 3000 });
  }
}
