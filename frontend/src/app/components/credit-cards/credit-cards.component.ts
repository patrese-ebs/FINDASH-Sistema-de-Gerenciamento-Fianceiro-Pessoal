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
    summary: any = null; // Store summary stats

    // Card Modal (Create/Edit)
    showModal: boolean = false;
    cardForm: FormGroup;
    submitting: boolean = false;
    editingCardId: string | null = null; // If set, we are editing

    // Invoice/Transaction Modal (Single Expense)
    showTransactionModal: boolean = false;
    transactionForm: FormGroup;
    selectedCard: CreditCard | null = null;
    isDetailedMode: boolean = true; // Default to detailed for "Nova Despesa"
    invoiceItems: any[] = [];

    // Planning Modal (12 Months)
    showPlanningModal: boolean = false;
    planningForm: FormGroup;
    planningMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    constructor(
        private cardService: CreditCardService,
        private transactionService: TransactionService,
        private fb: FormBuilder
    ) {
        // Card Form
        this.cardForm = this.fb.group({
            name: ['', Validators.required],
            limit: [0, [Validators.required, Validators.min(1)]],
            dueDay: [10, [Validators.required, Validators.min(1), Validators.max(31)]],
            closingDay: [3, [Validators.required, Validators.min(1), Validators.max(31)]],
            brand: ['Visa', Validators.required],
            lastFourDigits: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
            imageUrl: [''] // New field
        });

        // Transaction Form
        this.transactionForm = this.fb.group({
            month: [new Date().getMonth() + 1, Validators.required],
            year: [new Date().getFullYear(), Validators.required],
            installments: [1, [Validators.required, Validators.min(1)]],
            totalValue: [0], // Used if not detailed
            description: ['', Validators.required],
            category: ['Outros'],
            date: [new Date().toISOString().split('T')[0], Validators.required]
        });

        // Planning Form
        const planningControls: any = {
            cardId: ['', Validators.required],
            year: [new Date().getFullYear() + 1, Validators.required] // Default to next year? or current
        };
        this.planningMonths.forEach(m => {
            planningControls[`month_${m}`] = [0];
        });
        this.planningForm = this.fb.group(planningControls);
    }

    ngOnInit() {
        this.loadCards();
        this.loadSummary();
    }

    loadSummary() {
        const date = new Date();
        this.cardService.getSummary(date.getMonth() + 1, date.getFullYear()).subscribe({
            next: (data) => this.summary = data,
            error: (err) => console.error('Summary error', err)
        });
    }

    loadCards() {
        this.loading = true;
        this.cardService.getAll().subscribe({
            next: (data) => {
                this.cards = data;
                this.loading = false;
            },
            error: (err) => {
                console.error('Failed to load cards', err);
                this.loading = false;
            }
        });
    }

    // --- Card Create/Edit ---

    openNewCardModal() {
        this.editingCardId = null;
        this.cardForm.reset({
            dueDay: 10,
            closingDay: 3,
            brand: 'Visa'
        });
        this.showModal = true;
    }

    openEditCardModal(card: CreditCard) {
        this.editingCardId = card.id!;
        this.cardForm.patchValue({
            name: card.name,
            limit: card.limit,
            dueDay: card.dueDay,
            closingDay: card.closingDay,
            brand: card.brand,
            lastFourDigits: card.lastFourDigits,
            imageUrl: card.imageUrl || ''
        });
        this.showModal = true;
    }

    closeModal() {
        this.showModal = false;
        this.showTransactionModal = false;
        this.showPlanningModal = false;
        this.selectedCard = null;
    }

    onCardSubmit() {
        if (this.cardForm.invalid) return;
        this.submitting = true;

        const cardData = this.cardForm.value;

        if (this.editingCardId) {
            this.cardService.update(this.editingCardId, cardData).subscribe({
                next: () => {
                    this.loadCards(); // Reload to see changes
                    this.submitting = false;
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Update failed', err);
                    this.submitting = false;
                    alert('Erro ao atualizar cartão');
                }
            });
        } else {
            this.cardService.create(cardData).subscribe({
                next: (newCard) => {
                    this.cards.push(newCard);
                    this.submitting = false;
                    this.closeModal();
                },
                error: (err) => {
                    console.error('Create failed', err);
                    this.submitting = false;
                    alert('Erro ao criar cartão');
                }
            });
        }
    }

    // --- Transaction (Single Expense) ---

    openTransactionModal(card: CreditCard) {
        this.selectedCard = card;
        this.showTransactionModal = true;
        this.transactionForm.reset({
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
            installments: 1,
            category: 'Outros',
            date: new Date().toISOString().split('T')[0]
        });
    }

    onTransactionSubmit() {
        if (this.transactionForm.invalid || !this.selectedCard) return;
        this.submitting = true;

        const val = this.transactionForm.value;
        const tx: Transaction = {
            description: val.description,
            amount: val.totalValue, // Assuming total value logic for simplicity here, or use installments logic
            type: 'expense',
            category: val.category,
            date: val.date,
            paymentMethod: 'credit',
            creditCardId: this.selectedCard.id!,
            isPaid: false,
            installments: val.installments // If backend supports it on Transaction model, else handle logic
        };

        // Note: The backend logic for installments might be specific. 
        // For now, using the basic transaction creation. 
        // If we want the complex installment logic from the old HTML version, we'd replicate it here.
        // Assuming backend handles plain transactions linked to card.

        this.transactionService.create(tx).subscribe({
            next: () => {
                this.submitting = false;
                this.closeModal();
                alert('Despesa adicionada!');
            },
            error: (err) => {
                this.submitting = false;
                alert('Erro ao adicionar despesa');
            }
        });
    }

    // --- Planning (12 Months) ---

    openPlanningModal() {
        this.showPlanningModal = true;
        this.planningForm.patchValue({
            year: new Date().getFullYear(),
            cardId: this.cards.length > 0 ? this.cards[0].id : ''
        });
    }

    onPlanningSubmit() {
        if (this.planningForm.invalid) return;
        this.submitting = true;

        const val = this.planningForm.value;
        const plans = [];

        for (let m of this.planningMonths) {
            const amount = val[`month_${m}`];
            if (amount > 0) {
                plans.push({
                    month: m,
                    year: val.year,
                    amount: amount
                });
            }
        }

        if (plans.length === 0) {
            alert('Preencha pelo menos um mês.');
            this.submitting = false;
            return;
        }

        this.cardService.planInvoices(val.cardId, plans).subscribe({
            next: () => {
                this.submitting = false;
                this.closeModal();
                alert('Planejamento salvo!');
            },
            error: (err) => {
                this.submitting = false;
                alert('Erro ao salvar planejamento');
            }
        });
    }
}
