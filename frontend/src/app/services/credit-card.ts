import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreditCard } from '../models/credit-card.model';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class CreditCardService {
  private apiUrl = '/api/credit-cards';

  constructor(private http: HttpClient, private authService: AuthService) { }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  getAll(): Observable<CreditCard[]> {
    return this.http.get<CreditCard[]>(`${this.apiUrl}`, { headers: this.getHeaders() });
  }

  create(card: CreditCard): Observable<CreditCard> {
    return this.http.post<CreditCard>(`${this.apiUrl}`, card, { headers: this.getHeaders() });
  }

  update(id: string, card: Partial<CreditCard>): Observable<CreditCard> {
    return this.http.put<CreditCard>(`${this.apiUrl}/${id}`, card, { headers: this.getHeaders() });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  planInvoices(cardId: string, plans: any[]): Observable<any> {
    // Correct URL to match backend route: /credit-cards/:id/invoice/plan
    return this.http.post(`${this.apiUrl}/${cardId}/invoice/plan`, { plans }, { headers: this.getHeaders() });
  }

  getSummary(month: number, year: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/summary?month=${month}&year=${year}`, { headers: this.getHeaders() });
  }

  getInvoice(cardId: string, month: number, year: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${cardId}/invoice/${month}/${year}`, { headers: this.getHeaders() });
  }

  payInvoice(cardId: string, month: number, year: number, amount: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${cardId}/invoice/pay`, { month, year, amount }, { headers: this.getHeaders() });
  }

  unpayInvoice(cardId: string, month: number, year: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${cardId}/invoice/unpay`, { month, year }, { headers: this.getHeaders() });
  }

  getYearlyOverview(cardId: string, year: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${cardId}/yearly-overview/${year}`, { headers: this.getHeaders() });
  }
}
