import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface AdminUser {
    id: string;
    email: string;
    name: string;
    role: 'user' | 'admin';
    isActive: boolean;
    createdAt: string;
    updatedAt?: string;
}

export interface AdminStats {
    users: {
        total: number;
        active: number;
        inactive: number;
    };
    financial: {
        totalIncomes: number;
        totalExpenses: number;
        totalCreditCards: number;
        totalCreditCardTransactions: number;
        totalInvestments: number;
        incomeSum: number;
        expenseSum: number;
    };
}

@Injectable({
    providedIn: 'root'
})
export class AdminService {
    private apiUrl = '/api/admin';

    constructor(private http: HttpClient) { }

    getUsers(): Observable<AdminUser[]> {
        return this.http.get<AdminUser[]>(`${this.apiUrl}/users`).pipe(
            catchError(this.handleError)
        );
    }

    createUser(data: { email: string; password: string; name: string; role?: string }): Observable<AdminUser> {
        return this.http.post<AdminUser>(`${this.apiUrl}/users`, data).pipe(
            catchError(this.handleError)
        );
    }

    updateUser(id: string, data: { name?: string; email?: string; role?: string }): Observable<AdminUser> {
        return this.http.put<AdminUser>(`${this.apiUrl}/users/${id}`, data).pipe(
            catchError(this.handleError)
        );
    }

    toggleUserStatus(id: string): Observable<AdminUser> {
        return this.http.put<AdminUser>(`${this.apiUrl}/users/${id}/toggle-status`, {}).pipe(
            catchError(this.handleError)
        );
    }

    resetUserPassword(id: string, newPassword: string): Observable<any> {
        return this.http.put(`${this.apiUrl}/users/${id}/reset-password`, { newPassword }).pipe(
            catchError(this.handleError)
        );
    }

    getStats(): Observable<AdminStats> {
        return this.http.get<AdminStats>(`${this.apiUrl}/stats`).pipe(
            catchError(this.handleError)
        );
    }

    private handleError(error: any) {
        console.error('Admin Error:', error);
        return throwError(() => new Error(error.error?.error || 'Admin operation failed'));
    }
}
