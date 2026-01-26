export interface CreditCard {
    id?: string;
    name: string;
    lastFourDigits: string;
    brand: string;
    userId?: string;
    imageUrl?: string;
    // Backend computed fields
    creditLimit?: number; // Renamed from limit
    limit?: number; // Keeping optional for mapped access check
    closingDay: number;
    dueDay: number;
    totalLiability?: number;
    availableCredit?: number;
    usagePercentage?: number;
}
