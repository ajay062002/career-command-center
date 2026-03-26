import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RTR } from '../models/rtr.models';

@Injectable({
    providedIn: 'root'
})
export class RtrService {
    private apiUrl = environment.apiBaseUrl + '/rtrs';

    constructor(private http: HttpClient) { }

    getAllRTRs(): Observable<RTR[]> {
        return this.http.get<RTR[]>(`${this.apiUrl}/`);
    }

    createRTR(dto: Partial<RTR>): Observable<RTR> {
        return this.http.post<RTR>(`${this.apiUrl}/`, dto);
    }

    updateRTR(id: string, dto: Partial<RTR>): Observable<RTR> {
        return this.http.patch<RTR>(`${this.apiUrl}/${id}/`, dto);
    }

    deleteRTR(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}/`);
    }
}
