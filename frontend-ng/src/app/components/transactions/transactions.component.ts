import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TransactionService } from '../../services/transaction';
import { Transaction } from '../../models/transaction.model';

@Component({
    selector: 'app-transactions',
    standalone: true,
    imports: [CommonModule, SidebarComponent, ReactiveFormsModule],
    templateUrl: './transactions.component.html',
})
export class TransactionsComponent implements OnInit {
    transactions: Transaction[] = [];
    loading: boolean = false;
    showModal: boolean = false;
    transactionForm: FormGroup;
    submitting: boolean = false;

    constructor(
        private transactionService: TransactionService,
        private fb: FormBuilder
    ) {
        this.transactionForm = this.fb.group({
            description: ['', Validators.required],
            amount: [0, [Validators.required, Validators.min(0.01)]],
            type: ['expense', Validators.required],
            category: ['Outros', Validators.required],
            paymentMethod: ['pix', Validators.required],
            date: [new Date().toISOString().split('T')[0], Validators.required]
        });
    }

    ngOnInit() {
        this.loadTransactions();
    }

    loadTransactions() {
        this.loading = false; // Non-blocking load

        // Safety timeout
        const timeoutId = setTimeout(() => {
            if (this.loading) {
                console.warn('Transactions loading timed out');
                this.loading = false;
            }
        }, 5000);

        this.transactionService.getAll().subscribe({
            next: (data) => {
                clearTimeout(timeoutId);
                this.transactions = data;
                this.loading = false;
            },
            error: (err) => {
                clearTimeout(timeoutId);
                console.error('Failed to load transactions', err);
                this.loading = false;
            }
        });
    }

    openModal() {
        this.showModal = true;
        this.transactionForm.reset({
            type: 'expense',
            category: 'Outros',
            paymentMethod: 'pix',
            date: new Date().toISOString().split('T')[0]
        });
    }

    closeModal() {
        this.showModal = false;
    }

    onSubmit() {
        if (this.transactionForm.invalid) return;

        this.submitting = true;
        const formValue = this.transactionForm.value;

        // Convert amount to number if string
        formValue.amount = Number(formValue.amount);

        // Adjust for negative if expense? Backend usually expects positive amount and type field.
        // But if backend logic requires negative:
        if (formValue.type === 'expense' && formValue.amount > 0) {
            formValue.amount = -formValue.amount;
        }

        this.transactionService.create(formValue).subscribe({
            next: (newTx) => {
                this.transactions.unshift(newTx); // Add to top
                this.submitting = false;
                this.closeModal();
            },
            error: (err) => {
                console.error('Failed to create transaction', err);
                this.submitting = false;
                alert('Erro ao criar transação.');
            }
        });
    }
}
