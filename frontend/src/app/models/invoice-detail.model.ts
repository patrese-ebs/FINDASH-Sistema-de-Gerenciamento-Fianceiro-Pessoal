export interface InvoiceDetail {
    id?: string;
    creditCardId: string;
    month: number;
    year: number;
    description: string;
    amount: number;
    owner: string;
    installmentInfo?: string | null;
    category?: string | null;
}

export interface InvoiceDetailResponse {
    items: InvoiceDetail[];
    totalDetailed: number;
    invoiceTotal: number;
    undetailed: number;
    byOwner: { [owner: string]: number };
}

export interface OwnerSummary {
    [owner: string]: {
        total: number;
        months: number[];
    };
}
