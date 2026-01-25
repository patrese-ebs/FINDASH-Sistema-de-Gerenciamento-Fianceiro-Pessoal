export interface Transaction {
    id?: string;
    description: string;
    amount: number;
    category: string;
    date: string;
    type: 'income' | 'expense';
    paymentMethod: 'credit' | 'debit' | 'pix' | 'cash';
    isPaid: boolean;
    creditCardId?: string;
    userId?: string;
}
