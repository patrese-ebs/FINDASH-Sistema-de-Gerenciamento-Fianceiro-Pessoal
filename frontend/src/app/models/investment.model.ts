export interface Investment {
    id?: string;
    userId?: string;
    name: string;
    type: string;
    amountInvested: number;
    currentValue: number;
    purchaseDate: string;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}
