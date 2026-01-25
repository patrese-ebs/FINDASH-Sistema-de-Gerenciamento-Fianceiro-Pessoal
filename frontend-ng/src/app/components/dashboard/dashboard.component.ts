import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TransactionService } from '../../services/transaction';
import { AuthService } from '../../services/auth';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, SidebarComponent],
    templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit, AfterViewInit {
    loading: boolean = true;
    transactions: any[] = [];

    // Stats
    totalBalance: number = 0;
    projectedBalance: number = 0;
    monthlyIncome: number = 0;
    monthlyExpenses: number = 0;

    @ViewChild('cashFlowChart') cashFlowChartRef!: ElementRef;
    @ViewChild('expenseChart') expenseChartRef!: ElementRef;

    constructor(
        private transactionService: TransactionService,
        private authService: AuthService
    ) { }

    ngOnInit() {
        this.loading = true;
        // Safety timeout in case of network hang
        const timeout = setTimeout(() => {
            if (this.loading) {
                console.warn('Dashboard loading timed out');
                this.loading = false;
            }
        }, 5000);

        this.transactionService.getAll().subscribe({
            next: (data) => {
                clearTimeout(timeout);
                this.transactions = data || [];
                this.calculateStats();
                this.loading = false;
            },
            error: (err) => {
                clearTimeout(timeout);
                console.error('Failed to load dashboard data', err);
                this.loading = false;
            }
        });
    }

    ngAfterViewInit() {
        // wait for data or just init empty? Init empty then update.
        // simpler: valid data needed for charts.
        // In real app, use Signals or Effects. Here, timeout or subscription callback handling.
        // For now, I'll defer chart creation? 
        // Actually, I can create them in subscribe.
    }

    calculateStats() {
        // Basic logic to mimic the JS frontend
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const thisMonthTx = this.transactions.filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        const income = thisMonthTx.filter(t => t.type === 'income' || t.amount > 0); // specific logic depends on backend
        const expense = thisMonthTx.filter(t => t.type === 'expense' || t.amount < 0);

        this.monthlyIncome = income.reduce((acc, t) => acc + Math.abs(t.amount), 0);
        this.monthlyExpenses = expense.reduce((acc, t) => acc + Math.abs(t.amount), 0);

        this.totalBalance = this.monthlyIncome - this.monthlyExpenses; // simplistic view

        this.initCharts(thisMonthTx);
    }

    initCharts(data: any[]) {
        if (!this.cashFlowChartRef || !this.expenseChartRef) return;

        // Expense Breakdown
        const categories: any = {};
        data.filter(t => t.type === 'expense').forEach(t => {
            categories[t.category] = (categories[t.category] || 0) + Math.abs(t.amount);
        });

        new Chart(this.expenseChartRef.nativeElement, {
            type: 'doughnut',
            data: {
                labels: Object.keys(categories),
                datasets: [{
                    data: Object.values(categories),
                    backgroundColor: ['#818cf8', '#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { color: '#94a3b8' } }
                }
            }
        });

        // Cash Flow (dummy data for now or processed)
        new Chart(this.cashFlowChartRef.nativeElement, {
            type: 'line',
            data: {
                labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
                datasets: [
                    {
                        label: 'Receitas',
                        data: [3000, 3500, 3200, 4000, 3800, 4200, 0], // placeholders
                        borderColor: '#10b981',
                        tension: 0.4
                    },
                    {
                        label: 'Despesas',
                        data: [2000, 2200, 1800, 2500, 2100, 2300, 0],
                        borderColor: '#ef4444',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
                    x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                },
                plugins: { legend: { labels: { color: '#94a3b8' } } }
            }
        });
    }
}
