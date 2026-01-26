import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { CreditCardService } from '../../services/credit-card';
import { CreditCard } from '../../models/credit-card.model';
import { TransactionService } from '../../services/transaction';
import { Transaction } from '../../models/transaction.model';

@Component({
    selector: 'app-credit-cards',
    standalone: true,
    imports: [CommonModule, SidebarComponent, ReactiveFormsModule],
    templateUrl: './credit-cards.component.html',
})
export class CreditCardsComponent implements OnInit {
    cards: CreditCard[] = [];
    loading: boolean = false;
    showModal: boolean = false;
    cardForm: FormGroup;
    submitting: boolean = false;

    // Invoice Logic
    showInvoiceModal: boolean = false;
    invoiceForm: FormGroup;
    selectedCard: CreditCard | null = null;
    isDetailedMode: boolean = false;
    invoiceItems: any[] = [];

    constructor(
        private cardService: CreditCardService,
        private transactionService: TransactionService,
        private fb: FormBuilder
    ) {
        this.cardForm = this.fb.group({
            name: ['', Validators.required],
            limit: [0, [Validators.required, Validators.min(1)]],
            dueDay: [10, [Validators.required, Validators.min(1), Validators.max(31)]],
            closingDay: [3, [Validators.required, Validators.min(1), Validators.max(31)]],
            brand: ['Visa', Validators.required],
            lastFourDigits: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]]
        });

        this.invoiceForm = this.fb.group({
            month: [new Date().getMonth() + 1, Validators.required],
            year: [new Date().getFullYear(), Validators.required],
            installments: [1, [Validators.required, Validators.min(1)]],
            totalValue: [0, [Validators.required, Validators.min(0.01)]],
            itemDescription: [''],
            itemCategory: ['Outros'],
            itemValue: [0],
            itemDate: [new Date().toISOString().split('T')[0]]
        });
    }

    ngOnInit() {
        this.loadCards();
    }

    loadCards() {
        this.loading = false;
        const timeoutId = setTimeout(() => {
            if (this.loading) this.loading = false;
        }, 5000);

        this.cardService.getAll().subscribe({
            next: (data) => {
                clearTimeout(timeoutId);
                this.cards = data;
                this.loading = false;
            },
            error: (err) => {
                clearTimeout(timeoutId);
                console.error('Failed to load cards', err);
                this.loading = false;
            }
        });
    }

    openModal() {
        this.showModal = true;
        this.cardForm.reset({
            dueDay: 10,
            closingDay: 3,
            brand: 'Visa'
        });
    }

    closeModal() {
        this.showModal = false;
        this.showInvoiceModal = false;
        this.selectedCard = null;
    }

    openInvoiceModal(card: CreditCard) {
        this.selectedCard = card;
        this.showInvoiceModal = true;
        this.isDetailedMode = false;
        this.invoiceItems = [];
        this.invoiceForm.reset({
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
            installments: 1,
            totalValue: 0,
            itemCategory: 'Outros',
            itemDate: new Date().toISOString().split('T')[0]
        });
    }

    toggleDetailedMode() {
        this.isDetailedMode = !this.isDetailedMode;
        if (this.isDetailedMode) {
            this.invoiceForm.get('totalValue')?.disable();
        } else {
            this.invoiceForm.get('totalValue')?.enable();
        }
    }

    addItem() {
        const item = {
            description: this.invoiceForm.get('itemDescription')?.value,
            category: this.invoiceForm.get('itemCategory')?.value,
            amount: Number(this.invoiceForm.get('itemValue')?.value),
            date: this.invoiceForm.get('itemDate')?.value
        };

        if (item.description && item.amount > 0) {
            this.invoiceItems.push(item);
            this.updateTotalFromItems();
            this.invoiceForm.patchValue({
                itemDescription: '',
                itemValue: 0,
                itemCategory: 'Outros'
            });
        }
    }

    removeItem(index: number) {
        this.invoiceItems.splice(index, 1);
        this.updateTotalFromItems();
    }

    updateTotalFromItems() {
        const total = this.invoiceItems.reduce((sum, item) => sum + item.amount, 0);
        this.invoiceForm.patchValue({ totalValue: total });
    }

    get invoiceTotal() {
        return this.invoiceForm.get('totalValue')?.value || 0;
    }

    onSubmit() {
        if (this.cardForm.invalid) return;
        this.submitting = true;
        this.cardService.create(this.cardForm.value).subscribe({
            next: (newCard) => {
                this.cards.push(newCard);
                this.submitting = false;
                this.closeModal();
            },
            error: (err: any) => {
                console.error('Failed', err);
                this.submitting = false;
                alert('Erro ao criar cartão.');
            }
        });
    }

    onInvoiceSubmit() {
        if (!this.selectedCard) return;
        if (!this.isDetailedMode && this.invoiceForm.get('totalValue')?.invalid) return;
        if (this.isDetailedMode && this.invoiceItems.length === 0) {
            alert('Adicione pelo menos um item.');
            return;
        }

        this.submitting = true;
        const formValue = this.invoiceForm.value;
        const installments = formValue.installments;
        const transactionsToCreate: Transaction[] = [];

        if (this.isDetailedMode) {
            this.invoiceItems.forEach(item => {
                const tx: Transaction = {
                    description: `${item.description} (Cartão)`,
                    amount: item.amount, // Positive amount, strict type check handled by 'expense'
                    type: 'expense',
                    category: item.category,
                    date: item.date,
                    paymentMethod: 'credit',
                    creditCardId: this.selectedCard!.id,
                    isPaid: false
                };
                transactionsToCreate.push(tx);
            });
        } else {
            const installmentValue = formValue.totalValue / installments;
            for (let i = 0; i < installments; i++) {
                const date = new Date(formValue.year, formValue.month - 1 + i, this.selectedCard.dueDay || 10);
                const tx: Transaction = {
                    description: `Fatura ${this.selectedCard.name} (${i + 1}/${installments})`,
                    amount: installmentValue,
                    type: 'expense',
                    category: 'Cartão de Crédito',
                    date: date.toISOString().split('T')[0],
                    paymentMethod: 'credit',
                    creditCardId: this.selectedCard!.id,
                    isPaid: false
                };
                transactionsToCreate.push(tx);
            }
        }

        let completed = 0;
        let errors = 0;

        transactionsToCreate.forEach(tx => {
            this.transactionService.create(tx).subscribe({
                next: () => {
                    completed++;
                    if (completed + errors === transactionsToCreate.length) this.finishInvoiceSubmit(errors);
                },
                error: (err: any) => {
                    console.error('Failed tx', err);
                    errors++;
                    if (completed + errors === transactionsToCreate.length) this.finishInvoiceSubmit(errors);
                }
            });
        });
    }

    finishInvoiceSubmit(errors: number) {
        this.submitting = false;
        if (errors > 0) {
            alert(`Concluído com ${errors} erros.`);
        }
        this.closeModal();
    }
}
