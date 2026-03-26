import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ScrapedJob {
    id: string;
    title: string;
    company: string;
    location: string;
    link: string;
    summary: string;
    source: string;
    scrapedAt: string;
}

@Injectable({
    providedIn: 'root'
})
export class JobDiscoveryService {
    private apiUrl = `${environment.apiBaseUrl}/scraped-jobs`;
    private automationUrl = `${environment.apiBaseUrl}/automation`;

    constructor(private http: HttpClient) { }

    getScrapedJobs(): Observable<any> {
        return this.http.get(this.apiUrl);
    }

    scrapeJobs(keyword: string, location: string): Observable<any> {
        return this.http.post(`${this.automationUrl}/linkedin-scrape/`, { keyword, location });
    }

    promoteJob(id: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/${id}/promote/`, {});
    }

    deleteJob(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}/`);
    }
}
