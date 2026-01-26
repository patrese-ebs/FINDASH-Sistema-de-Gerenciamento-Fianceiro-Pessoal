import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { Transaction } from '../models/transaction.model';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private expensesUrl = '/api/expenses';
  private incomesUrl = '/api/incomes';

  constructor(private http: HttpClient, private authService: AuthService) { }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  getAll(): Observable<Transaction[]> {
    const expenses$ = this.http.get<any[]>(this.expensesUrl, { headers: this.getHeaders() });
    const incomes$ = this.http.get<any[]>(this.incomesUrl, { headers: this.getHeaders() });

    return forkJoin([expenses$, incomes$]).pipe(
      map(([expenses, incomes]) => {
        // Normalize Expenses
        const exp: Transaction[] = expenses.map(e => ({
          id: e.id,
          description: e.description,
          amount: Number(e.amount),
          type: 'expense',
          category: e.category,
          date: e.date,
          paymentMethod: e.paymentMethod,
          isPaid: e.isPaid,
          userId: e.userId
        }));

        // Normalize Incomes
        const inc: Transaction[] = incomes.map(i => ({
          id: i.id,
          description: i.description,
          amount: Number(i.amount),
          type: 'income',
          category: i.category || 'Salário',
          date: i.date,
          paymentMethod: 'pix',
          isPaid: i.isPaid, // Backend Income model uses isPaid directly
          userId: i.userId
        }));

        return [...exp, ...inc].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      })
    );
  }

  create(transaction: Transaction): Observable<Transaction> {
    const url = transaction.type === 'income' ? this.incomesUrl : this.expensesUrl;
    // Backend uses isPaid for both incomes and expenses
    return this.http.post<Transaction>(url, transaction, { headers: this.getHeaders() });
  }

  update(id: string, data: Partial<Transaction>): Observable<Transaction> {
    const type = data.type;
    const url = (type === 'income') ? `${this.incomesUrl}/${id}` : `${this.expensesUrl}/${id}`;

    // Backend uses isPaid for both incomes and expenses
    return this.http.patch<Transaction>(url, data, { headers: this.getHeaders() });
  }
}
