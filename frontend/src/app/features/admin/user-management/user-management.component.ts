import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatSnackBarModule],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss'
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  displayedColumns: string[] = ['id', 'username', 'email', 'role', 'actions'];
  private apiUrl = environment.apiBaseUrl + '/users';

  constructor(private http: HttpClient, private snackBar: MatSnackBar, private router: Router) { }

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

  getAdminCount(): number {
    return this.users.filter(u => u.role === 'ROLE_ADMIN').length;
  }

  viewReport(userId: string): void {
    this.router.navigate(['/analytics'], { queryParams: { userId } });
  }
}
