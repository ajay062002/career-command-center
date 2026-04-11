import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private apiUrl = environment.apiBaseUrl + '/auth';

    constructor(private http: HttpClient) { }

    login(credentials: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/login/`, credentials).pipe(
            tap(user => localStorage.setItem('currentUser', JSON.stringify(user)))
        );
    }

    register(user: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/register/`, user);
    }

    logout(): void {
        localStorage.removeItem('currentUser');
    }

    isLoggedIn(): boolean {
        return !!localStorage.getItem('currentUser');
    }

    getCurrentUser(): any {
        const user = localStorage.getItem('currentUser');
        return user ? JSON.parse(user) : null;
    }

    isAdmin(): boolean {
        const user = this.getCurrentUser();
        return user && user.role === 'ROLE_ADMIN';
    }

    changeOwnPassword(oldPassword: string, newPassword: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/change-password/`, { old_password: oldPassword, new_password: newPassword });
    }

    adminResetPassword(userId: string, newPassword: string): Observable<any> {
        const usersUrl = environment.apiBaseUrl + '/users';
        return this.http.post(`${usersUrl}/${userId}/change-password/`, { new_password: newPassword });
    }
}
