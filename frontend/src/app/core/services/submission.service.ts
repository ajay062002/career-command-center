import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Submission } from '../models/submission.models';

@Injectable({
    providedIn: 'root'
})
export class SubmissionService {
    private apiUrl = environment.apiBaseUrl + '/submissions';

    constructor(private http: HttpClient) { }

    getAllSubmissions(): Observable<Submission[]> {
        return this.http.get<Submission[]>(`${this.apiUrl}/`);
    }

    createSubmission(dto: Partial<Submission>): Observable<Submission> {
        return this.http.post<Submission>(`${this.apiUrl}/`, dto);
    }

    updateSubmission(id: string, dto: Partial<Submission>): Observable<Submission> {
        return this.http.put<Submission>(`${this.apiUrl}/${id}/`, dto);
    }

    deleteSubmission(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}/`);
    }
}
