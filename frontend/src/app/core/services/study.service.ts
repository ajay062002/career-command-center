import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StudySession } from '../models/study.models';

@Injectable({
    providedIn: 'root'
})
export class StudyService {
    private apiUrl = environment.apiBaseUrl + '/study-sessions';

    constructor(private http: HttpClient) { }

    createSession(dto: StudySession): Observable<StudySession> {
        return this.http.post<StudySession>(`${this.apiUrl}/`, dto);
    }

    getSessionsBetween(start: string, end: string): Observable<StudySession[]> {
        const params = new HttpParams()
            .set('start', start)
            .set('end', end);
        return this.http.get<StudySession[]>(`${this.apiUrl}/`, { params });
    }

    getTotalMinutesBetween(start: string, end: string): Observable<number> {
        const params = new HttpParams()
            .set('start', start)
            .set('end', end);
        return this.http.get<number>(`${this.apiUrl}/total/`, { params });
    }
}
