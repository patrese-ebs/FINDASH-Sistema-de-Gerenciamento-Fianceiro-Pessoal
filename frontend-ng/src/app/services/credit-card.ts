import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreditCard } from '../models/credit-card.model';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class CreditCardService {
  private apiUrl = 'http://localhost:3000/api/credit-cards';

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
}
