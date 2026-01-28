export interface CreditCard {
    id?: string;
    name: string;
    lastFourDigits: string;
    brand: string;
    imageUrl?: string;
    creditLimit: number;
    closingDay: number;
    dueDay: number;
    sharedLimitCardId?: string | null;
    // Computed fields
    currentInvoiceAmount?: number;
    totalLiability?: number;
    currentBalance?: number;
    availableCredit?: number;
    usagePercentage?: string; // "50.00"
    currentInvoiceIsPaid?: boolean;
    isOverdue?: boolean;
}
