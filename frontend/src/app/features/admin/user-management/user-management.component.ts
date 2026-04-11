import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

// ─── Change Password Dialog ───────────────────────────────────────────────────
@Component({
  selector: 'app-change-password-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule,
            MatButtonModule, MatIconModule, MatDialogModule, MatProgressSpinnerModule],
  template: `
    <div class="dialog-wrapper">
      <div class="dialog-header">
        <div class="dialog-icon">
          <mat-icon>lock_reset</mat-icon>
        </div>
        <div>
          <h2 mat-dialog-title>Reset Password</h2>
          <p class="dialog-subtitle">for <strong>{{ data.username }}</strong></p>
        </div>
      </div>

      <mat-dialog-content>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>New Password</mat-label>
          <input matInput [type]="hideNew ? 'password' : 'text'" [(ngModel)]="newPassword"
                 placeholder="Min. 6 characters" (keyup.enter)="submit()">
          <button mat-icon-button matSuffix (click)="hideNew = !hideNew" type="button">
            <mat-icon>{{ hideNew ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Confirm New Password</mat-label>
          <input matInput [type]="hideConfirm ? 'password' : 'text'" [(ngModel)]="confirmPassword"
                 placeholder="Re-enter new password" (keyup.enter)="submit()">
          <button mat-icon-button matSuffix (click)="hideConfirm = !hideConfirm" type="button">
            <mat-icon>{{ hideConfirm ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
        </mat-form-field>

        <p class="error-msg" *ngIf="errorMsg">{{ errorMsg }}</p>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-stroked-button mat-dialog-close [disabled]="loading">Cancel</button>
        <button mat-raised-button class="save-btn" (click)="submit()" [disabled]="loading || !newPassword">
          <mat-progress-spinner diameter="18" mode="indeterminate" *ngIf="loading"></mat-progress-spinner>
          <mat-icon *ngIf="!loading">lock_reset</mat-icon>
          <span>{{ loading ? 'Saving...' : 'Reset Password' }}</span>
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-wrapper { padding: 8px 8px 0; min-width: 380px; }
    .dialog-header { display: flex; align-items: center; gap: 16px; margin-bottom: 8px; }
    .dialog-icon {
      width: 52px; height: 52px; border-radius: 14px;
      background: linear-gradient(135deg, #1565c0, #42a5f5);
      display: flex; align-items: center; justify-content: center;
      mat-icon { color: white; font-size: 28px; width: 28px; height: 28px; }
    }
    h2[mat-dialog-title] { margin: 0; font-size: 1.3rem; font-weight: 700; }
    .dialog-subtitle { margin: 2px 0 0; font-size: 0.9rem; opacity: 0.7; }
    .full-width { width: 100%; margin-top: 12px; }
    .error-msg { color: #f44336; font-size: 0.85rem; margin: 4px 0 0; }
    mat-dialog-actions { gap: 8px; padding-bottom: 16px; }
    .save-btn {
      background: linear-gradient(135deg, #1565c0, #42a5f5) !important;
      color: white !important;
      display: flex; align-items: center; gap: 8px;
    }
  `]
})
export class ChangePasswordDialogComponent {
  newPassword = '';
  confirmPassword = '';
  hideNew = true;
  hideConfirm = true;
  loading = false;
  errorMsg = '';

  constructor(
    public dialogRef: MatDialogRef<ChangePasswordDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { userId: string; username: string },
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  submit(): void {
    this.errorMsg = '';
    if (this.newPassword.length < 6) {
      this.errorMsg = 'Password must be at least 6 characters.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.errorMsg = 'Passwords do not match.';
      return;
    }
    this.loading = true;
    this.authService.adminResetPassword(this.data.userId, this.newPassword).subscribe({
      next: (res) => {
        this.loading = false;
        this.snackBar.open(`✅ ${res.detail}`, 'Close', { duration: 4000 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err?.error?.detail || 'Failed to reset password.';
      }
    });
  }
}

// ─── User Management Component ────────────────────────────────────────────────
@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule,
            MatSnackBarModule, MatDialogModule, MatTooltipModule,
            ChangePasswordDialogComponent],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss'
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  displayedColumns: string[] = ['id', 'username', 'email', 'role', 'actions'];
  private apiUrl = environment.apiBaseUrl + '/users';

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private router: Router,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.http.get<any>(`${this.apiUrl}/`).subscribe({
      next: (data) => this.users = data.content ?? data,
      error: () => this.snackBar.open('Failed to load users', 'Close', { duration: 3000 })
    });
  }

  deleteUser(id: string): void {
    if (confirm('Are you sure you want to delete this user?')) {
      this.http.delete(`${this.apiUrl}/${id}/`).subscribe({
        next: () => {
          this.users = this.users.filter(u => u.id !== id);
          this.snackBar.open('User deleted', 'Close', { duration: 3000 });
        }
      });
    }
  }

  promoteUser(user: User): void {
    this.http.put(`${this.apiUrl}/${user.id}/toggle_role/`, {}).subscribe({
      next: (updatedUser: any) => {
        user.role = updatedUser.role;
        this.snackBar.open(`Role updated to ${user.role}`, 'Close', { duration: 3000 });
      }
    });
  }

  openChangePassword(user: User): void {
    this.dialog.open(ChangePasswordDialogComponent, {
      data: { userId: user.id, username: user.username },
      panelClass: 'change-password-panel',
      disableClose: false
    });
  }

  getAdminCount(): number {
    return this.users.filter(u => u.role === 'ROLE_ADMIN').length;
  }

  viewReport(userId: string): void {
    this.router.navigate(['/analytics'], { queryParams: { userId } });
  }
}
