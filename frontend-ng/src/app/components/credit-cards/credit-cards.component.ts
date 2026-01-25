import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { CreditCardService } from '../../services/credit-card';
import { CreditCard } from '../../models/credit-card.model';

@Component({
    selector: 'app-credit-cards',
    standalone: true,
    imports: [CommonModule, SidebarComponent],
    templateUrl: './credit-cards.component.html',
})
export class CreditCardsComponent implements OnInit {
    cards: CreditCard[] = [];
    loading: boolean = true;

    constructor(private cardService: CreditCardService) { }

    ngOnInit() {
        this.loadCards();
    }

    loadCards() {
        this.loading = true;

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
}
