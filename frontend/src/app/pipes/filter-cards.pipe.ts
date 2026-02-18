import { Pipe, PipeTransform } from '@angular/core';
import { CreditCard } from '../models/credit-card.model';

@Pipe({ name: 'filterCards', standalone: true, pure: false })
export class FilterCardsPipe implements PipeTransform {
    transform(cards: CreditCard[], filter: 'all' | 'pending' | 'paid' | 'cancelled'): number {
        if (!cards) return 0;
        switch (filter) {
            case 'pending':
                return cards.filter(c =>
                    c.enabled !== false &&
                    !c.currentInvoiceIsPaid &&
                    (c.currentInvoiceAmount || 0) > 0
                ).length;
            case 'paid':
                return cards.filter(c =>
                    c.enabled !== false &&
                    c.currentInvoiceIsPaid &&
                    (c.currentInvoiceAmount || 0) > 0
                ).length;
            case 'cancelled':
                return cards.filter(c => c.enabled === false).length;
            default:
                return cards.length;
        }
    }
}
