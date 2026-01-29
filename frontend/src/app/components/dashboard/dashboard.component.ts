import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TransactionService } from '../../services/transaction';
import { AuthService } from '../../services/auth';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, SidebarComponent],
    templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit, AfterViewInit {
    loading: boolean = false;
    error: string = '';
    transactions: any[] = [];

    // AI Insights
    insights: string = '';
    loadingInsights: boolean = false;


    // Filter state
    selectedMonth: number = new Date().getMonth() + 1;
    selectedYear: number = new Date().getFullYear();

    months = [
        { val: 1, label: 'Janeiro' }, { val: 2, label: 'Fevereiro' }, { val: 3, label: 'Março' },
        { val: 4, label: 'Abril' }, { val: 5, label: 'Maio' }, { val: 6, label: 'Junho' },
        { val: 7, label: 'Julho' }, { val: 8, label: 'Agosto' }, { val: 9, label: 'Setembro' },
        { val: 10, label: 'Outubro' }, { val: 11, label: 'Novembro' }, { val: 12, label: 'Dezembro' }
    ];

    // Stats
    totalBalance: number = 0;
    projectedBalance: number = 0;
    monthlyIncome: number = 0;
    monthlyExpenses: number = 0;

    @ViewChild('cashFlowChart') cashFlowChartRef!: ElementRef;
    @ViewChild('expenseChart') expenseChartRef!: ElementRef;

    // Chart instances to destroy before re-creating
    private expenseChart: Chart | null = null;
    private cashFlowChart: Chart | null = null;

    constructor(
        private transactionService: TransactionService,
        private authService: AuthService,
        private http: HttpClient
    ) { }

    ngOnInit() {
        this.loading = true;
        this.loadData();
        this.loadInsights();
    }

    ngAfterViewInit() {
        // Charts will be initialized after data load
    }

    loadData() {
        // Safety timeout: Auto-fail if taking longer than 5s
        const timeoutId = setTimeout(() => {
            if (this.loading) {
                console.warn('Dashboard loading timed out');
                this.error = 'O servidor demorou para responder (Timeout). Verifique sua conexão ou se o backend está rodando.';
                this.loading = false;
            }
        }, 5000);

        this.transactionService.getAll().subscribe({
            next: (data) => {
                clearTimeout(timeoutId);
                this.transactions = data || [];
                this.calculateStats();
                this.loading = false;
            },
            error: (err) => {
                clearTimeout(timeoutId);
                console.error('Failed to load dashboard data', err);
                this.error = 'Erro de conexão: ' + (err.error?.message || err.statusText || 'Falha ao contatar API');
                this.loading = false;
            }
        });
    }

    loadInsights() {
        this.loadingInsights = true;
        const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);

        this.http.get<{ insights: string }>('/api/ai/insights', { headers }).subscribe({
            next: (data) => {
                this.insights = data.insights;
                this.loadingInsights = false;
            },
            error: (err) => {
                console.error('Failed to load insights', err);
                this.loadingInsights = false;
            }
        });
    }

    prevMonth() {
        if (this.selectedMonth === 1) {
            this.selectedMonth = 12;
            this.selectedYear--;
        } else {
            this.selectedMonth--;
        }
        this.calculateStats();
    }

    nextMonth() {
        if (this.selectedMonth === 12) {
            this.selectedMonth = 1;
            this.selectedYear++;
        } else {
            this.selectedMonth++;
        }
        this.calculateStats();
    }

    getMonthName(monthVal: number): string {
        return this.months.find(m => m.val === monthVal)?.label || 'Mês';
    }

    calculateStats() {
        // Filter by selected month/year
        const thisMonthTx = this.transactions.filter(t => {
            const d = new Date(t.date);
            // Handle both Date objects and string dates if necessary, 
            // though getAll usually normalizes.
            // Be robust:
            // If string is YYYY-MM-DD
            let year, month;
            if (typeof t.date === 'string') {
                [year, month] = t.date.split('-').map(Number);
            } else {
                year = d.getFullYear();
                month = d.getMonth() + 1;
            }

            // Note: split gives month 1-12. Date.getMonth() gives 0-11 so we'd need +1.
            // Using split is safer if format is YYYY-MM-DD
            return month === this.selectedMonth && year === this.selectedYear;
        });

        const income = thisMonthTx.filter(t => t.type === 'income' || (t.amount > 0 && !t.isInvoice));
        const expense = thisMonthTx.filter(t => t.type === 'expense' || t.amount < 0);

        this.monthlyIncome = income.reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0);
        this.monthlyExpenses = expense.reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0);

        this.totalBalance = this.monthlyIncome - this.monthlyExpenses;

        // Projected logic could be: All income - All expense (including pending)
        // For now, let's assume totalBalance IS the projected if we include pending.
        // If we want "Paid only" vs "Projected", we'd filter by isPaid.
        // Let's stick to simple Total for now.

        this.initCharts(thisMonthTx);
    }

    initCharts(data: any[]) {
        if (!this.cashFlowChartRef || !this.expenseChartRef) return;

        // Destroy old charts if they exist
        if (this.expenseChart) this.expenseChart.destroy();
        if (this.cashFlowChart) this.cashFlowChart.destroy();

        // Expense Breakdown
        const categories: any = {};
        data.filter(t => t.type === 'expense').forEach(t => {
            const cat = t.category || 'Outros';
            categories[cat] = (categories[cat] || 0) + Math.abs(Number(t.amount));
        });

        this.expenseChart = new Chart(this.expenseChartRef.nativeElement, {
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

        // Cash Flow - Showing daily accumulation for the selected month
        // Create labels for all days in month
        const daysInMonth = new Date(this.selectedYear, this.selectedMonth, 0).getDate();
        const labels = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());

        const incomeData = new Array(daysInMonth).fill(0);
        const expenseData = new Array(daysInMonth).fill(0);

        data.forEach(t => {
            const day = new Date(t.date).getDate() - 1; // 0-indexed day
            if (day >= 0 && day < daysInMonth) {
                if (t.type === 'income') incomeData[day] += Math.abs(Number(t.amount));
                else expenseData[day] += Math.abs(Number(t.amount));
            }
        });

        this.cashFlowChart = new Chart(this.cashFlowChartRef.nativeElement, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Receitas',
                        data: incomeData,
                        borderColor: '#10b981',
                        tension: 0.4
                    },
                    {
                        label: 'Despesas',
                        data: expenseData,
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
