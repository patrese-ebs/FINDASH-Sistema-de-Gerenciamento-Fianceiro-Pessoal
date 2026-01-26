import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Investment } from '../models/investment.model';
import { AuthService } from './auth';

@Injectable({
    providedIn: 'root'
})
export class InvestmentService {
    private apiUrl = '/api/investments';

    constructor(private http: HttpClient, private authService: AuthService) { }

    private getHeaders(): HttpHeaders {
        const token = this.authService.getToken();
        return new HttpHeaders().set('Authorization', `Bearer ${token}`);
    }

    getAll(): Observable<Investment[]> {
        return this.http.get<Investment[]>(`${this.apiUrl}`, { headers: this.getHeaders() });
    }

    create(investment: Investment): Observable<Investment> {
        return this.http.post<Investment>(`${this.apiUrl}`, investment, { headers: this.getHeaders() });
    }

    update(id: string, investment: Investment): Observable<Investment> {
        return this.http.put<Investment>(`${this.apiUrl}/${id}`, investment, { headers: this.getHeaders() });
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
    }
}
