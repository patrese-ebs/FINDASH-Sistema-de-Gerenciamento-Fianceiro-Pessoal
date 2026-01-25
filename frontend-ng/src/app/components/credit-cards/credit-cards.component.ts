import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { CreditCardService } from '../../services/credit-card';
import { CreditCard } from '../../models/credit-card.model';

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

    constructor(
        private cardService: CreditCardService,
        private fb: FormBuilder
    ) {
        this.cardForm = this.fb.group({
            name: ['', Validators.required],
            limit: [0, [Validators.required, Validators.min(1)]],
            dueDay: [10, [Validators.required, Validators.min(1), Validators.max(31)]],
            closingDay: [3, [Validators.required, Validators.min(1), Validators.max(31)]], // Added closing day as it is common
            brand: ['Visa', Validators.required],
            lastFourDigits: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]]
        });
    }

    ngOnInit() {
        this.loadCards();
    }

    loadCards() {
        this.loading = false; // Non-blocking load

        // Safety timeout
        const timeoutId = setTimeout(() => {
            if (this.loading) {
                console.warn('Cards loading timed out');
                this.loading = false;
            }
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
    }

    onSubmit() {
        if (this.cardForm.invalid) return;

        this.submitting = true;
        const formValue = this.cardForm.value;

        this.cardService.create(formValue).subscribe({
            next: (newCard) => {
                this.cards.push(newCard);
                this.submitting = false;
                this.closeModal();
            },
            error: (err) => {
                console.error('Failed to create card', err);
                this.submitting = false;
                alert('Erro ao criar cartão.');
            }
        });
    }
}
