import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { CreditCardService } from '../../services/credit-card';
import { CreditCard } from '../../models/credit-card.model';
import { TransactionService } from '../../services/transaction';
import { Transaction } from '../../models/transaction.model';

@Component({
    selector: 'app-credit-cards',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule],
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
    editingTransactionId: string | null = null;

    // Planning Modal (12 Months)
    showPlanningModal: boolean = false;
    planningForm: FormGroup;
    planningMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    // Invoice View Modal (Yearly Overview)
    showInvoiceModal: boolean = false;
    invoiceYear: number = new Date().getFullYear();
    yearlyOverview: any[] = [];
    selectedMonthIndex: number | null = null; // For accordion

    // Recurrence Logic
    showRecurrenceModal: boolean = false;
    recurrenceAction: 'edit' | 'delete' | null = null;
    pendingRecurrenceItem: any = null;
    pendingRecurrenceFormValue: any = null;
    isEditingRecurrent: boolean = false;
    currentRefMonth: number | null = null;
    currentRefYear: number | null = null;

    // Payment UI state
    paymentAmount: number = 0;
    viewingCard: CreditCard | null = null;
    months = [
        { val: 1, label: 'Janeiro' }, { val: 2, label: 'Fevereiro' }, { val: 3, label: 'Março' },
        { val: 4, label: 'Abril' }, { val: 5, label: 'Maio' }, { val: 6, label: 'Junho' },
        { val: 7, label: 'Julho' }, { val: 8, label: 'Agosto' }, { val: 9, label: 'Setembro' },
        { val: 10, label: 'Outubro' }, { val: 11, label: 'Novembro' }, { val: 12, label: 'Dezembro' }
    ];

    constructor(
        private cardService: CreditCardService,
        private transactionService: TransactionService,
        private fb: FormBuilder
    ) {
        // Card Form
        this.cardForm = this.fb.group({
            name: ['', Validators.required],
            creditLimit: [0, [Validators.required, Validators.min(1)]],
            dueDay: [10, [Validators.required, Validators.min(1), Validators.max(31)]],
            closingDay: [3, [Validators.required, Validators.min(1), Validators.max(31)]],
            brand: ['Visa', Validators.required],
            lastFourDigits: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
            imageUrl: [''], // New field
            sharedLimitCardId: [null], // Shared limit
            enabled: [true] // Active/Cancelled
        });

        // Disable credit limit validator if shared limit is selected
        this.cardForm.get('sharedLimitCardId')?.valueChanges.subscribe(val => {
            const limitControl = this.cardForm.get('creditLimit');
            if (val) {
                limitControl?.clearValidators();
                limitControl?.disable();
            } else {
                limitControl?.setValidators([Validators.required, Validators.min(1)]);
                limitControl?.enable();
            }
            limitControl?.updateValueAndValidity();
        });

        // Transaction Form
        this.transactionForm = this.fb.group({
            cardId: ['', Validators.required], // Add card selection
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

    get availableParentCards(): CreditCard[] {
        if (!this.editingCardId) return this.cards;
        // Exclude self from parent options to avoid cycles
        return this.cards.filter(c => c.id !== this.editingCardId);
    }

    getParentCardName(card: CreditCard): string {
        if (!card.sharedLimitCardId) return '';
        const parent = this.cards.find(c => c.id === card.sharedLimitCardId);
        return parent ? parent.name : 'Cartão Desconhecido';
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
            creditLimit: card.creditLimit, // Use creditLimit
            dueDay: card.dueDay,
            closingDay: card.closingDay,
            brand: card.brand,
            lastFourDigits: card.lastFourDigits,
            imageUrl: card.imageUrl || '',
            sharedLimitCardId: card.sharedLimitCardId || null,
            enabled: card.enabled !== undefined ? card.enabled : true
        });
        this.showModal = true;
    }

    closeModal() {
        this.showModal = false;
        this.showTransactionModal = false;
        this.showPlanningModal = false;
        this.showInvoiceModal = false;
        this.showInvoiceModal = false;
        this.selectedCard = null;
        this.showRecurrenceModal = false;
        this.recurrenceAction = null;
        this.pendingRecurrenceItem = null;
        this.pendingRecurrenceFormValue = null;
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

    onDeleteCard() {
        if (!this.editingCardId) return;

        if (confirm('Tem certeza que deseja excluir este cartão? Todas as transações associadas serão perdidas.')) {
            this.submitting = true;
            this.cardService.delete(this.editingCardId).subscribe({
                next: () => {
                    this.loadCards();
                    this.submitting = false;
                    this.closeModal();
                    alert('Cartão excluído com sucesso!');
                },
                error: (err) => {
                    console.error('Delete failed', err);
                    this.submitting = false;
                    alert('Erro ao excluir cartão');
                }
            });
        }
    }

    // --- Transaction (Single Expense) ---

    openTransactionModal(card?: CreditCard) {
        this.editingTransactionId = null; // Reset edit mode
        this.selectedCard = card || (this.cards.length > 0 ? this.cards[0] : null);
        this.showTransactionModal = true;
        this.transactionForm.reset({
            cardId: this.selectedCard ? this.selectedCard.id : '',
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
            installments: 1,
            totalValue: 0,
            category: 'Outros',
            date: new Date().toISOString().split('T')[0]
        });
    }

    onTransactionSubmit() {
        if (this.transactionForm.invalid) return;
        this.submitting = true;

        const val = this.transactionForm.value;

        if (this.editingTransactionId) {
            // Check for Recurrence Edit
            if (this.isEditingRecurrent && !this.recurrenceAction) { // Only if not already confirmed
                this.recurrenceAction = 'edit';
                this.pendingRecurrenceFormValue = val;
                this.showRecurrenceModal = true;
                this.submitting = false;
                return;
            }

            // Update Existing Credit Card Transaction using CreditCardService
            const updateData = {
                description: val.description,
                totalAmount: val.totalValue,
                installments: val.installments,
                category: val.category,
                purchaseDate: val.date
            };

            this.cardService.updateTransaction(val.cardId, this.editingTransactionId, updateData).subscribe({
                next: () => {
                    this.submitting = false;
                    this.closeModal();
                    alert('Despesa atualizada!');
                    // Reload overview if applicable
                    if (this.viewingCard && this.showInvoiceModal) {
                        this.loadYearlyOverview(this.viewingCard.id!, this.invoiceYear);
                    }
                    this.loadCards();
                    this.loadSummary();
                },
                error: (err) => {
                    console.error('Update failed', err);
                    this.submitting = false;
                    alert('Erro ao atualizar despesa');
                }
            });
        } else {
            // Create New Transaction
            const tx: Transaction = {
                description: val.description,
                amount: val.totalValue,
                type: 'expense',
                category: val.category,
                date: val.date,
                paymentMethod: 'credit',
                creditCardId: val.cardId,
                isPaid: false,
                installments: val.installments
            };

            this.transactionService.create(tx).subscribe({
                next: () => {
                    this.submitting = false;
                    this.closeModal();
                    alert('Despesa adicionada!');
                    if (this.viewingCard && this.showInvoiceModal) {
                        this.loadYearlyOverview(this.viewingCard.id!, this.invoiceYear);
                    }
                    this.loadCards();
                    this.loadSummary();
                },
                error: (err) => {
                    this.submitting = false;
                    alert('Erro ao adicionar despesa');
                }
            });
        }
    }


    // --- Planning (12 Months) ---

    openPlanningModal() {
        this.showPlanningModal = true;
        const defaultCardId = this.cards.length > 0 ? this.cards[0].id : '';
        const currentYear = new Date().getFullYear();

        this.planningForm.patchValue({
            year: currentYear,
            cardId: defaultCardId
        });

        // Reset month values
        this.planningMonths.forEach(m => {
            this.planningForm.patchValue({ [`month_${m}`]: 0 });
        });

        // Auto-load existing data
        if (defaultCardId) {
            this.loadPlanningData();
        }
    }

    loadPlanningData() {
        const cardId = this.planningForm.get('cardId')?.value;
        const year = this.planningForm.get('year')?.value;

        if (!cardId || !year) return;

        this.cardService.getYearlyOverview(cardId, year).subscribe({
            next: (data) => {
                // Populate form with existing totals
                data.forEach(monthData => {
                    const formControlName = `month_${monthData.month}`;
                    // Use the total from existing transactions
                    this.planningForm.patchValue({
                        [formControlName]: monthData.total || 0
                    });
                });
            },
            error: (err) => {
                console.error('Failed to load planning data', err);
            }
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
                this.loadCards();
                this.loadSummary();
            },
            error: (err) => {
                this.submitting = false;
                alert('Erro ao salvar planejamento');
            }
        });
    }


    // --- Invoice Viewer ---

    // --- Invoice Viewer (Yearly Overview) ---

    openInvoiceModal(card: CreditCard) {
        this.viewingCard = card;
        this.showInvoiceModal = true;
        this.invoiceYear = new Date().getFullYear();
        this.loadYearlyOverview(card.id!, this.invoiceYear);
        this.selectedMonthIndex = new Date().getMonth(); // Expand current month
    }

    loadYearlyOverview(cardId: string, year: number) {
        this.cardService.getYearlyOverview(cardId, year).subscribe({
            next: (data) => {
                this.yearlyOverview = data;
            },
            error: (err) => {
                console.error('Failed to load yearly overview', err);
                this.yearlyOverview = [];
            }
        });
    }

    toggleMonth(index: number) {
        if (this.selectedMonthIndex === index) {
            this.selectedMonthIndex = null;
        } else {
            this.selectedMonthIndex = index;
            // Pre-fill payment amount - use remaining if partially paid, else total
            const monthData = this.yearlyOverview[index];
            if (monthData) {
                this.paymentAmount = monthData.remainingAmount ?? monthData.total;
            }
        }
    }

    prevYear() {
        this.invoiceYear--;
        if (this.viewingCard) this.loadYearlyOverview(this.viewingCard.id!, this.invoiceYear);
    }

    nextYear() {
        this.invoiceYear++;
        if (this.viewingCard) this.loadYearlyOverview(this.viewingCard.id!, this.invoiceYear);
    }

    payInvoice(monthIndex: number) {
        if (!this.viewingCard) return;

        const monthData = this.yearlyOverview[monthIndex];
        if (!monthData) return;

        if (confirm(`Confirmar pagamento de ${this.paymentAmount} referente a ${monthData.month}/${monthData.year}?`)) {
            this.cardService.payInvoice(this.viewingCard.id!, monthData.month, monthData.year, this.paymentAmount)
                .subscribe({
                    next: () => {
                        alert('Pagamento registrado!');
                        this.loadYearlyOverview(this.viewingCard!.id!, this.invoiceYear);
                        this.loadCards();
                        this.loadSummary();
                    },
                    error: (err) => {
                        console.error('Payment failed', err);
                        alert('Erro ao processar pagamento');
                    }
                });
        }
    }

    unpayInvoice(monthIndex: number) {
        if (!this.viewingCard) return;

        const monthData = this.yearlyOverview[monthIndex];
        if (!monthData) return;

        const monthName = this.months[monthData.month - 1]?.label || monthData.month;

        if (confirm(`Desfazer pagamento de ${monthName}/${monthData.year}? Isso marcará a fatura como não paga.`)) {
            this.cardService.unpayInvoice(this.viewingCard.id!, monthData.month, monthData.year)
                .subscribe({
                    next: () => {
                        alert('Pagamento desfeito!');
                        this.loadYearlyOverview(this.viewingCard!.id!, this.invoiceYear);
                        this.loadCards();
                        this.loadSummary();
                    },
                    error: (err) => {
                        console.error('Unpay failed', err);
                        alert('Erro ao desfazer pagamento');
                    }
                });
        }
    }

    editInvoiceItem(item: any) {
        const tx: Transaction = {
            id: item.id,
            description: item.description,
            amount: item.totalAmount || item.amount || 0, // Fallback
            type: item.category === 'Pagamentos' ? 'income' : 'expense',
            category: item.category,
            date: typeof item.purchaseDate === 'string' ? item.purchaseDate : new Date(item.purchaseDate).toISOString().split('T')[0],
            paymentMethod: 'credit',
            creditCardId: item.creditCardId,
            isPaid: false,
            installments: item.installments
        };
        this.openEditTransactionModal(tx);
    }

    deleteInvoiceItem(item: any) {
        if (!this.viewingCard) return;

        // Capture Ref Context
        this.currentRefMonth = this.selectedMonthIndex !== null ? this.selectedMonthIndex + 1 : null;
        this.currentRefYear = this.invoiceYear;

        if (item.installments > 1) {
            this.recurrenceAction = 'delete';
            this.pendingRecurrenceItem = item;
            this.showRecurrenceModal = true;
            return;
        }

        const installmentInfo = item.installments > 1
            ? ` (${item.installmentNumber}/${item.installments})`
            : '';

        if (confirm(`Excluir "${item.description}"${installmentInfo}? Esta ação não pode ser desfeita.`)) {
            this.cardService.deleteTransaction(this.viewingCard.id!, item.id).subscribe({
                next: () => {
                    alert('Despesa excluída com sucesso!');
                    this.loadYearlyOverview(this.viewingCard!.id!, this.invoiceYear);
                    this.loadCards();
                    this.loadSummary();
                },
                error: (err) => {
                    console.error('Delete failed', err);
                    alert('Erro ao excluir despesa');
                }
            });
        }
    }

    openEditTransactionModal(t: Transaction) {
        this.selectedCard = this.cards.find(c => c.id === t.creditCardId) || null;
        this.showTransactionModal = true;
        this.editingCardId = null;
        this.editingCardId = null;
        this.editingTransactionId = t.id!;
        this.isEditingRecurrent = (t.installments || 1) > 1;
        this.currentRefMonth = this.selectedMonthIndex !== null ? this.selectedMonthIndex + 1 : null;
        this.currentRefYear = this.invoiceYear;

        this.transactionForm.patchValue({
            cardId: t.creditCardId,
            description: t.description,
            totalValue: t.amount,
            installments: t.installments,
            category: t.category,
            date: t.date.toString().split('T')[0]
        });
    }

    // Recurrence Actions
    confirmRecurrence(mode: 'all' | 'future') {
        this.showRecurrenceModal = false;
        this.submitting = true;
        const refMonth = this.currentRefMonth;
        const refYear = this.currentRefYear;

        if (this.recurrenceAction === 'delete') {
            const item = this.pendingRecurrenceItem;
            // For delete, we send the deleteMode and Ref
            this.cardService.deleteTransaction(this.viewingCard!.id!, item.id, {
                deleteMode: mode,
                refMonth,
                refYear
            }).subscribe({
                next: () => {
                    alert('Despesa excluída!');
                    this.loadYearlyOverview(this.viewingCard!.id!, this.invoiceYear);
                    this.loadCards();
                    this.loadSummary();
                    this.submitting = false;
                    this.recurrenceAction = null;
                },
                error: (err) => {
                    console.error(err);
                    alert('Erro ao excluir');
                    this.submitting = false;
                }
            });

        } else if (this.recurrenceAction === 'edit') {
            const val = this.pendingRecurrenceFormValue;

            const updateData = {
                description: val.description,
                totalAmount: val.totalValue,
                installments: val.installments,
                category: val.category,
                purchaseDate: val.date,
                updateMode: mode,
                refMonth,
                refYear
            };

            this.cardService.updateTransaction(val.cardId, this.editingTransactionId!, updateData).subscribe({
                next: () => {
                    this.submitting = false;
                    this.closeModal();
                    alert('Despesa atualizada!');
                    if (this.viewingCard && this.showInvoiceModal) {
                        this.loadYearlyOverview(this.viewingCard.id!, this.invoiceYear);
                    }
                    this.loadCards();
                    this.loadSummary();
                    this.recurrenceAction = null;
                },
                error: (err) => {
                    console.error('Update failed', err);
                    this.submitting = false;
                    alert('Erro ao atualizar despesa');
                }
            });
        }
    }

    // Helper for class binding
    getBrandClass(brand: string): string {
        const gradients: { [key: string]: string } = {
            'Nubank': 'from-[#820AD1] to-[#400078]',
            'Inter': 'from-[#FF7A00] to-[#FF5200]',
            'Itaú': 'from-[#EC7000] to-[#E74E0E]',
            'Santander': 'from-[#EC0000] to-[#990000]',
            'Bradesco': 'from-[#CC092F] to-[#990020]',
            'C6': 'from-[#2C2C2C] to-[#000000]',
            'Banco do Brasil': 'from-[#0038A8] to-[#001D5E]',
            'Visa': 'from-[#1A1F71] to-[#0057B8]',
            'Mastercard': 'from-[#EB001B] to-[#F79E1B]',
            'Elo': 'from-[#00A4E0] to-[#F9B233]',
            'Amex': 'from-[#006FCF] to-[#002663]',
            'Hipercard': 'from-[#BE0000] to-[#820000]'
        };
        return gradients[brand] || 'from-slate-800 to-black';
    }
}

