export interface CreditCard {
    id?: string;
    name: string;
    lastFourDigits: string;
    brand: string;
    limit: number;
    closingDay: number;
    dueDay: number;
    userId?: string;
    imageUrl?: string;
}
