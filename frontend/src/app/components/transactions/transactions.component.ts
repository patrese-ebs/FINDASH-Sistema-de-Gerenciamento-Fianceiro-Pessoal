import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TransactionService } from '../../services/transaction';
import { Transaction } from '../../models/transaction.model';

@Component({
    selector: 'app-transactions',
    standalone: true,
    imports: [CommonModule, SidebarComponent, ReactiveFormsModule, RouterLink],
    templateUrl: './transactions.component.html',
})
export class TransactionsComponent implements OnInit {
    transactions: Transaction[] = [];
    loading: boolean = false;
    showModal: boolean = false;
    transactionForm: FormGroup;
    submitting: boolean = false;
    editingTransactionId: string | null = null; // Track editing state

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
    selectedMonth: number = new Date().getMonth() + 1;
    selectedYear: number = new Date().getFullYear();
    filterType: 'income' | 'expense' = 'expense'; // Default to expense
    statusFilter: 'all' | 'paid' | 'pending' = 'all';

    months = [
        { val: 1, label: 'Janeiro' }, { val: 2, label: 'Fevereiro' }, { val: 3, label: 'Março' },
        { val: 4, label: 'Abril' }, { val: 5, label: 'Maio' }, { val: 6, label: 'Junho' },
        { val: 7, label: 'Julho' }, { val: 8, label: 'Agosto' }, { val: 9, label: 'Setembro' },
        { val: 10, label: 'Outubro' }, { val: 11, label: 'Novembro' }, { val: 12, label: 'Dezembro' }
    ];

    // Getters for computed values
    get filteredTransactions() {
        return this.transactions.filter(t => {
            const date = new Date(t.date);
            // Fix: parse date correctly if string
            const [year, month] = t.date.toString().split('-').map(Number);

            const matchesType = t.type === this.filterType;
            const matchesDate = month === this.selectedMonth && year === this.selectedYear;

            let matchesStatus = true;
            if (this.statusFilter === 'paid') matchesStatus = t.isPaid;
            if (this.statusFilter === 'pending') matchesStatus = !t.isPaid;

            return matchesType && matchesDate && matchesStatus;
        });
    }

    // Helper to filter transactions by selected month/year
    private getMonthTransactions() {
        return this.transactions.filter(t => {
            const [year, month] = t.date.toString().split('-').map(Number);
            return month === this.selectedMonth && year === this.selectedYear;
        });
    }

    // Computed Values - Now filtered by selected month
    get totalIncome() {
        return this.getMonthTransactions()
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + Number(t.amount), 0);
    }

    get receivedIncome() {
        return this.getMonthTransactions()
            .filter(t => t.type === 'income' && t.isPaid)
            .reduce((sum, t) => sum + Number(t.amount), 0);
    }

    get predictedIncome() {
        return this.totalIncome; // "Previsto" is total for the month
    }

    get totalExpense() {
        return this.getMonthTransactions()
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + Number(t.amount), 0);
    }

    get paidExpense() {
        return this.getMonthTransactions()
            .filter(t => t.type === 'expense' && t.isPaid)
            .reduce((sum, t) => sum + Number(t.amount), 0);
    }

    get toPayExpense() {
        return this.totalExpense - this.paidExpense;
    }

    get balance() {
        // Balance for the selected month: Total Income - Total Expense
        return this.totalIncome - this.totalExpense;
    }

    toggleStatus(t: Transaction) {
        const newStatus = !t.isPaid;
        // Optimistic update
        t.isPaid = newStatus;

        // Include type so service knows which endpoint to use
        this.transactionService.update(t.id!, { isPaid: newStatus, type: t.type }).subscribe({
            next: () => {
                // Success - status was updated
            },
            error: (err) => {
                console.error('Failed to update status', err);
                t.isPaid = !newStatus; // Revert on error
                alert('Erro ao atualizar status');
            }
        });
    }

    // UI Helpers
    setFilter(type: 'income' | 'expense') {
        this.filterType = type;
        this.statusFilter = 'all'; // Reset status when switching type
    }

    setStatusFilter(status: 'all' | 'paid' | 'pending') {
        this.statusFilter = status;
    }

    prevMonth() {
        if (this.selectedMonth === 1) {
            this.selectedMonth = 12;
            this.selectedYear--;
        } else {
            this.selectedMonth--;
        }
        this.loadTransactions(); // If we move to backend filtering later
    }

    nextMonth() {
        if (this.selectedMonth === 12) {
            this.selectedMonth = 1;
            this.selectedYear++;
        } else {
            this.selectedMonth++;
        }
        this.loadTransactions();
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
        this.editingTransactionId = null; // access check
        this.transactionForm.reset({
            type: 'expense',
            category: 'Outros',
            paymentMethod: 'pix',
            date: new Date().toISOString().split('T')[0],
            description: '',
            amount: 0
        });
    }

    editTransaction(t: Transaction) {
        this.showModal = true;
        this.editingTransactionId = t.id!;

        // Format date to YYYY-MM-DD
        const dateStr = t.date.toString().split('T')[0];

        this.transactionForm.patchValue({
            description: t.description,
            amount: Math.abs(t.amount), // Show positive
            type: t.type,
            category: t.category,
            paymentMethod: t.paymentMethod,
            date: dateStr
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

        if (this.editingTransactionId) {
            this.transactionService.update(this.editingTransactionId, formValue).subscribe({
                next: (updatedTx) => {
                    // Update list locally
                    const index = this.transactions.findIndex(t => t.id === this.editingTransactionId);
                    if (index !== -1) {
                        this.transactions[index] = { ...this.transactions[index], ...updatedTx, isPaid: this.transactions[index].isPaid };
                        // Note: Backend might return isReceived for income, assume service normalized it or we keep existing isPaid if not in response
                        // Actually service getAll normalizes, but update response might be raw.
                        // Let's reload or safe merge.

                        // Better: Reload to be safe with normalization or re-normalize locally
                        this.loadTransactions();
                    }
                    this.submitting = false;
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Failed to update', err);
                    this.submitting = false;
                    alert('Erro ao atualizar.');
                }
            });
        } else {
            this.transactionService.create(formValue).subscribe({
                next: (newTx) => {
                    // this.transactions.unshift(newTx); // Reload is safer for order/normalization
                    this.loadTransactions();
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
}
