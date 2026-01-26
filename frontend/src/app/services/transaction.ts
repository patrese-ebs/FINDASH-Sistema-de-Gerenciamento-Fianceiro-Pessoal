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
          amount: Number(e.amount), // Expenses usually positive in DB but treated as expense
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
          category: i.category || 'Salário', // Default category if missing
          date: i.date,
          paymentMethod: 'pix', // Incomes might not have method, default?
          isPaid: i.isReceived, // Incomes use isReceived usually? Checking logic needed
          userId: i.userId
        }));

        return [...exp, ...inc].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      })
    );
  }

  create(transaction: Transaction): Observable<Transaction> {
    const url = transaction.type === 'income' ? this.incomesUrl : this.expensesUrl;
    // Backend expects specific payloads probably, but let's try sending common fields
    // IncomeController usually expects: description, amount, date, category?
    // ExpenseController: description, amount, date, category, paymentMethod, isPaid?

    // Map 'isPaid' to 'isReceived' for income if necessary
    const payload = { ...transaction };
    if (transaction.type === 'income') {
      (payload as any).isReceived = transaction.isPaid;
    }

    return this.http.post<Transaction>(url, payload, { headers: this.getHeaders() });
  }

  update(id: string, data: Partial<Transaction>): Observable<Transaction> {
    // This is tricky because we don't know if ID refers to Income or Expense just by ID.
    // But `data` usually comes from a fetched object which we tagged with 'type'.
    const type = data.type;
    // If type is missing in partial update, we have a problem. 
    // Component usually passes the object or we need to know type.
    // For now, assume component passes type or we try one? 
    // Actually, let's assume the component knows.

    const url = (type === 'income') ? `${this.incomesUrl}/${id}` : `${this.expensesUrl}/${id}`;

    const payload = { ...data };
    if (type === 'income' && data.isPaid !== undefined) {
      (payload as any).isReceived = data.isPaid;
    }

    return this.http.patch<Transaction>(url, payload, { headers: this.getHeaders() });
  }
}
