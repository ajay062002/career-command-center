import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardSummary, JobStatusCount, StudyTrend, RtrTimelineEntry, VendorPerformance } from '../models/dashboard.models';

@Injectable({
    providedIn: 'root'
})
export class DashboardService {
    private apiUrl = environment.apiBaseUrl + '/analytics';

    constructor(private http: HttpClient) { }

    private buildParams(userId?: string): HttpParams {
        let params = new HttpParams();
        if (userId) params = params.set('userId', userId);
        return params;
    }

    getDashboardSummary(userId?: string): Observable<DashboardSummary> {
        return this.http.get<DashboardSummary>(`${this.apiUrl}/dashboard/`, { params: this.buildParams(userId) });
    }

    getJobsStatus(userId?: string): Observable<JobStatusCount[]> {
        return this.http.get<JobStatusCount[]>(`${this.apiUrl}/jobs-by-status/`, { params: this.buildParams(userId) });
    }

    getStudyTrend(userId?: string): Observable<StudyTrend[]> {
        return this.http.get<StudyTrend[]>(`${this.apiUrl}/study-trend/`, { params: this.buildParams(userId) });
    }

    getRtrTimeline(userId?: string): Observable<RtrTimelineEntry[]> {
        return this.http.get<RtrTimelineEntry[]>(`${this.apiUrl}/rtr-timeline/`, { params: this.buildParams(userId) });
    }

    getVendorPerformance(userId?: string): Observable<VendorPerformance[]> {
        return this.http.get<VendorPerformance[]>(`${this.apiUrl}/vendor-performance/`, { params: this.buildParams(userId) });
    }
}
