import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { InvestmentService } from '../../services/investment';
import { Investment } from '../../models/investment.model';

@Component({
    selector: 'app-investments',
    standalone: true,
    imports: [CommonModule, SidebarComponent, ReactiveFormsModule],
    templateUrl: './investments.component.html',
})
export class InvestmentsComponent implements OnInit {
    investments: Investment[] = [];
    loading: boolean = false;

    // Summary Stats
    totalInvested: number = 0;
    currentTotal: number = 0;
    totalYield: number = 0;
    yieldPercent: number = 0;

    // Modal
    showModal: boolean = false;
    form: FormGroup;
    submitting: boolean = false;
    editingId: string | null = null;

    constructor(
        private investmentService: InvestmentService,
        private fb: FormBuilder
    ) {
        this.form = this.fb.group({
            name: ['', Validators.required],
            type: ['Renda Fixa', Validators.required],
            amountInvested: [0, [Validators.required, Validators.min(0.01)]],
            currentValue: [0, [Validators.required, Validators.min(0)]],
            purchaseDate: [new Date().toISOString().split('T')[0], Validators.required],
            notes: ['']
        });
    }

    ngOnInit() {
        this.loadInvestments();
    }

    loadInvestments() {
        this.loading = true;
        this.investmentService.getAll().subscribe({
            next: (data) => {
                this.investments = data;
                this.calculateSummary();
                this.loading = false;
            },
            error: (err) => {
                console.error('Failed to load investments', err);
                this.loading = false;
            }
        });
    }

    calculateSummary() {
        this.totalInvested = this.investments.reduce((sum, i) => sum + Number(i.amountInvested), 0);
        this.currentTotal = this.investments.reduce((sum, i) => sum + Number(i.currentValue), 0);
        this.totalYield = this.currentTotal - this.totalInvested;
        this.yieldPercent = this.totalInvested > 0 ? (this.totalYield / this.totalInvested) * 100 : 0;
    }

    getProfit(inv: Investment): number {
        return Number(inv.currentValue) - Number(inv.amountInvested);
    }

    getProfitPercent(inv: Investment): number {
        const profit = this.getProfit(inv);
        const invested = Number(inv.amountInvested);
        return invested > 0 ? (profit / invested) * 100 : 0;
    }

    openModal(investment?: Investment) {
        this.showModal = true;
        if (investment) {
            this.editingId = investment.id!;
            this.form.patchValue({
                name: investment.name,
                type: investment.type,
                amountInvested: investment.amountInvested,
                currentValue: investment.currentValue,
                purchaseDate: investment.purchaseDate, // Assuming ISO string YYYY-MM-DD
                notes: investment.notes
            });
        } else {
            this.editingId = null;
            this.form.reset({
                type: 'Renda Fixa',
                purchaseDate: new Date().toISOString().split('T')[0],
                amountInvested: 0,
                currentValue: 0
            });
        }
    }

    closeModal() {
        this.showModal = false;
    }

    onSubmit() {
        if (this.form.invalid) return;
        this.submitting = true;
        const data = this.form.value;

        if (this.editingId) {
            this.investmentService.update(this.editingId, data).subscribe({
                next: () => {
                    this.submitting = false;
                    this.closeModal();
                    this.loadInvestments();
                },
                error: (err) => {
                    console.error('Update failed', err);
                    this.submitting = false;
                    alert('Erro ao atualizar');
                }
            });
        } else {
            this.investmentService.create(data).subscribe({
                next: () => {
                    this.submitting = false;
                    this.closeModal();
                    this.loadInvestments();
                },
                error: (err) => {
                    console.error('Create failed', err);
                    this.submitting = false;
                    alert('Erro ao criar');
                }
            });
        }
    }

    deleteInvestment(id: string) {
        if (!confirm('Tem certeza?')) return;
        this.investmentService.delete(id).subscribe({
            next: () => this.loadInvestments(),
            error: () => alert('Erro ao excluir')
        });
    }
}
