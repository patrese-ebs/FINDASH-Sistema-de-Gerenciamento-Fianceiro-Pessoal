import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { Transaction } from '../models/transaction.model';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private expensesUrl = '/api/expenses';
  private incomesUrl = '/api/incomes';
  private creditCardsUrl = '/api/credit-cards';

  constructor(private http: HttpClient, private authService: AuthService) { }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  getAll(): Observable<Transaction[]> {
    const expenses$ = this.http.get<any[]>(this.expensesUrl, { headers: this.getHeaders() });
    const incomes$ = this.http.get<any[]>(this.incomesUrl, { headers: this.getHeaders() });
    const cards$ = this.http.get<any[]>(this.creditCardsUrl, { headers: this.getHeaders() }).pipe(
      catchError(() => of([]))
    );

    return forkJoin([expenses$, incomes$, cards$]).pipe(
      switchMap(([expenses, incomes, cards]) => {
        // Normalize Expenses
        const exp: Transaction[] = expenses.map(e => ({
          id: e.id,
          description: e.description,
          amount: Number(e.amount),
          type: 'expense' as const,
          category: e.category,
          date: e.date,
          paymentMethod: e.paymentMethod,
          isPaid: e.isPaid,
          userId: e.userId,
          isRecurring: e.isRecurring,
          recurrenceFrequency: e.recurrenceFrequency,
          recurrenceEndDate: e.recurrenceEndDate,
          recurrenceId: e.recurrenceId
        }));

        // Normalize Incomes
        const inc: Transaction[] = incomes.map(i => ({
          id: i.id,
          description: i.description,
          amount: Number(i.amount),
          type: 'income' as const,
          category: i.category || 'Salário',
          date: i.date,
          paymentMethod: 'pix',
          isPaid: i.isPaid,
          userId: i.userId
        }));

        // If no cards, return just expenses and incomes
        if (cards.length === 0) {
          return of([...exp, ...inc].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        }

        // Fetch yearly overview for each card to get invoice data
        const currentYear = new Date().getFullYear();
        const invoiceRequests = cards.map(card =>
          this.http.get<any[]>(`${this.creditCardsUrl}/${card.id}/yearly-overview/${currentYear}`, { headers: this.getHeaders() }).pipe(
            map(overview => ({ card, overview })),
            catchError(() => of({ card, overview: [] }))
          )
        );

        return forkJoin(invoiceRequests).pipe(
          map(cardInvoices => {
            const invoiceTransactions: Transaction[] = [];

            cardInvoices.forEach(({ card, overview }) => {
              overview.forEach((month: any) => {
                if (month.total > 0) {
                  // Create a virtual transaction for each card invoice with balance
                  const dueDate = new Date(month.year, month.month - 1, card.dueDay || 10);
                  const invTx: Transaction = {
                    id: `invoice-${card.id}-${month.month}-${month.year}`,
                    description: `Fatura ${card.name}`,
                    amount: month.total,
                    type: 'expense',
                    category: 'Cartão de Crédito',
                    date: dueDate.toISOString().split('T')[0],
                    paymentMethod: 'credit',
                    isPaid: month.isPaid,
                    userId: card.userId,
                    isInvoice: true,
                    creditCardId: card.id,
                    cardName: card.name,
                    invoiceMonth: month.month,
                    invoiceYear: month.year,
                    paidAmount: month.paidAmount,
                    remainingAmount: month.remainingAmount,
                    isPartiallyPaid: month.isPartiallyPaid
                  };
                  invoiceTransactions.push(invTx);
                }
              });
            });

            return [...exp, ...inc, ...invoiceTransactions].sort((a, b) =>
              new Date(b.date).getTime() - new Date(a.date).getTime()
            );
          })
        );
      })
    );
  }

  create(transaction: Transaction): Observable<Transaction> {
    const url = transaction.type === 'income' ? this.incomesUrl : this.expensesUrl;
    return this.http.post<Transaction>(url, transaction, { headers: this.getHeaders() });
  }

  update(id: string, data: Partial<Transaction>): Observable<Transaction> {
    const type = data.type;
    const url = (type === 'income') ? `${this.incomesUrl}/${id}` : `${this.expensesUrl}/${id}`;

    return this.http.put<Transaction>(url, data, { headers: this.getHeaders() });
  }

  delete(id: string, deleteRecurring: boolean = false): Observable<void> {
    const url = `${this.expensesUrl}/${id}?deleteRecurring=${deleteRecurring}`;
    return this.http.delete<void>(url, { headers: this.getHeaders() });
  }
}
