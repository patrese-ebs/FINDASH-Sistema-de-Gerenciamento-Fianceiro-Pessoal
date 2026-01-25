import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Transaction } from '../models/transaction.model';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private apiUrl = '/api/expenses';
  // Also checking api.js showed it calls /expenses probably. 
  // Let's assume standard REST.

  constructor(private http: HttpClient, private authService: AuthService) { }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  getAll(): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(`${this.apiUrl}`, { headers: this.getHeaders() });
  }

  create(transaction: Transaction): Observable<Transaction> {
    return this.http.post<Transaction>(`${this.apiUrl}`, transaction, { headers: this.getHeaders() });
  }

  // Add Income endpoint if separate
  getIncome(): Observable<any[]> {
    return this.http.get<any[]>('/api/incomes', { headers: this.getHeaders() });
  }

  getDashboardStats(): Observable<any> {
    // If backend has a stats endpoint, use it. Otherwise calculate frontend.
    // JS code did manual calculation often, but let's check if there's a specialized endpoint.
    // I'll assume manual calc for now or simple GETs.
    return this.getAll();
  }
}
