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
    enabled?: boolean;
    // Computed fields
    currentInvoiceAmount?: number;
    totalLiability?: number;
    currentBalance?: number;
    availableCredit?: number;
    usagePercentage?: number; // "50.00"
    currentInvoiceIsPaid?: boolean;
    isOverdue?: boolean;
}
