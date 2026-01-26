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

    // Computed Values
    get totalIncome() {
        return this.transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + Number(t.amount), 0);
    }

    get receivedIncome() {
        return this.transactions
            .filter(t => t.type === 'income' && t.isPaid)
            .reduce((sum, t) => sum + Number(t.amount), 0);
    }

    get predictedIncome() {
        return this.totalIncome; // "Previsto" is usually total including pending
    }

    get totalExpense() {
        return this.transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + Number(t.amount), 0);
    }

    get paidExpense() {
        return this.transactions
            .filter(t => t.type === 'expense' && t.isPaid)
            .reduce((sum, t) => sum + Number(t.amount), 0);
    }

    get toPayExpense() {
        return this.totalExpense - this.paidExpense;
    }

    get balance() {
        // Balance = Realized Income - Realized Expense? Or Predicted?
        // Usually Balance is "What I have left".
        // Let's use Realized Income - Realized Expense for "Current Balance"
        // But user might want "Predicted Balance".
        // Let's keep simple: Total Income - Total Expense for now, or match user request?
        // User asked for specific breakdown cards. The Balance card wasn't explicitly detailed to change.
        // I will keep balance as Total - Total for now, or maybe Realized Income - Paid Expense.
        return this.totalIncome - this.totalExpense;
    }

    toggleStatus(t: Transaction) {
        const newStatus = !t.isPaid;
        // Optimistic
        t.isPaid = newStatus;

        this.transactionService.update(t.id!, { isPaid: newStatus }).subscribe({
            error: (err) => {
                console.error('Failed to update status', err);
                t.isPaid = !newStatus; // Revert
                // Use a toast or alert service ideally
            }
        });
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
