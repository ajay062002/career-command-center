import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Job, JobPage } from '../models/job.models';

@Injectable({
    providedIn: 'root'
})
export class JobService {
    private apiUrl = environment.apiBaseUrl + '/jobs';

    constructor(private http: HttpClient) { }

    getAllJobs(page: number, size: number): Observable<JobPage> {
        return this.http.get<JobPage>(`${this.apiUrl}/?page=${page}&size=${size}`);
    }

    getJobById(id: string): Observable<Job> {
        return this.http.get<Job>(`${this.apiUrl}/${id}/`);
    }

    createJob(job: Job): Observable<Job> {
        return this.http.post<Job>(`${this.apiUrl}/`, job);
    }

    updateJob(id: string, job: Job): Observable<Job> {
        return this.http.put<Job>(`${this.apiUrl}/${id}/`, job);
    }

    deleteJob(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}/`);
    }
}
