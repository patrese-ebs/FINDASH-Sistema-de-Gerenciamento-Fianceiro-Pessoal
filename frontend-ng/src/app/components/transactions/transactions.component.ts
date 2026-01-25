import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TransactionService } from '../../services/transaction';
import { Transaction } from '../../models/transaction.model';

@Component({
    selector: 'app-transactions',
    standalone: true,
    imports: [CommonModule, SidebarComponent],
    templateUrl: './transactions.component.html',
})
export class TransactionsComponent implements OnInit {
    transactions: Transaction[] = [];
    loading: boolean = true;

    constructor(private transactionService: TransactionService) { }

    ngOnInit() {
        this.loadTransactions();
    }

    loadTransactions() {
        this.loading = true;
        this.transactionService.getAll().subscribe({
            next: (data) => {
                this.transactions = data;
                this.loading = false;
            },
            error: (err) => {
                console.error('Failed to load transactions', err);
                this.loading = false;
            }
        });
    }
}
