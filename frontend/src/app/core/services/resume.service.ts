import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ResumeService {
    private apiUrl = environment.apiBaseUrl + '/automation';

    constructor(private http: HttpClient) {}

    getBaseContent(): Observable<any> {
        return this.http.get(`${this.apiUrl}/base-content/`);
    }

    generateResume(content: any, jdText: string): Observable<Blob> {
        return this.http.post(
            `${this.apiUrl}/generate-resume/`,
            { resume_data: content, jd_text: jdText },
            { responseType: 'blob' }
        );
    }

    draftEmail(jdText: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/draft-email/`, { jd_text: jdText });
    }

    /**
     * Smart tailor: sends JD + base content + section flags.
     * Backend returns only the updated sections + detected keywords.
     */
    tailorSections(payload: {
        jd_text: string;
        base_content: any;
        sections: {
            title: boolean;
            summary: boolean;
            td: boolean;
            ch: boolean;
            env: boolean;
        };
    }): Observable<any> {
        return this.http.post(`${this.apiUrl}/tailor-sections/`, payload);
    }
}
