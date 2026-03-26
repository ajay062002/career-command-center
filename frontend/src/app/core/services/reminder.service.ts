import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Reminder } from '../models/reminder.models';

@Injectable({
    providedIn: 'root'
})
export class ReminderService {
    private apiUrl = environment.apiBaseUrl + '/reminders';

    constructor(private http: HttpClient) { }

    getAllReminders(): Observable<Reminder[]> {
        return this.http.get<Reminder[]>(`${this.apiUrl}/`);
    }

    createReminder(dto: Partial<Reminder>): Observable<Reminder> {
        return this.http.post<Reminder>(`${this.apiUrl}/`, dto);
    }

    getOverdueReminders(): Observable<Reminder[]> {
        return this.http.get<Reminder[]>(`${this.apiUrl}/overdue/`);
    }

    markComplete(id: string): Observable<void> {
        return this.http.put<void>(`${this.apiUrl}/${id}/complete/`, {});
    }

    deleteReminder(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}/`);
    }
}
