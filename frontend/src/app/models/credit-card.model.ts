export interface CreditCard {
    id?: string;
    name: string;
    lastFourDigits: string;
    brand: string;
    userId?: string;
    imageUrl?: string;
    // Backend computed fields
    creditLimit?: number;
    limit?: number;
    closingDay: number;
    dueDay: number;
    totalLiability?: number;
    availableCredit?: number;
    usagePercentage?: number;
    currentInvoiceAmount?: number;
    currentInvoiceIsPaid?: boolean;
    isOverdue?: boolean;
}
