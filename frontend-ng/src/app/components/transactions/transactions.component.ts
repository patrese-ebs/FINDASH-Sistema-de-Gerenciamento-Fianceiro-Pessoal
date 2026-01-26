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

    // Filter state
    filterType: 'all' | 'income' | 'expense' = 'all';

    // Getters for computed values
    get filteredTransactions() {
        if (this.filterType === 'all') return this.transactions;
        return this.transactions.filter(t => t.type === this.filterType);
    }

    get totalIncome() {
        return this.transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + Number(t.amount), 0); // Ensure calculated as number
    }

    get totalExpense() {
        return this.transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + Number(t.amount), 0);
    }

    get balance() {
        return this.totalIncome - this.totalExpense;
    }

    // UI Helpers
    setFilter(type: 'all' | 'income' | 'expense') {
        this.filterType = type;
    }

    getCategoryColor(category: string): string {
        const colors: { [key: string]: string } = {
            'Salário': 'text-emerald-400',
            'Freelance': 'text-blue-400',
            'Investimentos': 'text-purple-400',
            'Aluguel': 'text-orange-400',
            'Alimentação': 'text-orange-400',
            'Transporte': 'text-blue-400',
            'Moradia': 'text-indigo-400',
            'Saúde': 'text-red-400',
            'Educação': 'text-yellow-400',
            'Lazer': 'text-pink-400',
            'Outros': 'text-gray-400'
        };
        return colors[category] || 'text-gray-400';
    }

    getCategoryBg(category: string): string {
        const bgs: { [key: string]: string } = {
            'Salário': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            'Freelance': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            'Investimentos': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
            'Aluguel': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
            'Alimentação': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
            'Transporte': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            'Moradia': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
            'Saúde': 'bg-red-500/10 text-red-400 border-red-500/20',
            'Educação': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
            'Lazer': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
            'Outros': 'bg-gray-500/10 text-gray-400 border-gray-500/20'
        };
        return bgs[category] || bgs['Outros'];
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
