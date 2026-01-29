import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

interface ExpenseData {
    description: string;
    totalAmount: number;
    category: string;
    purchaseDate: string;
    isPaid: boolean;
    installments?: number;
}

class AiService {

    private getClient(): GoogleGenerativeAI {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('GEMINI_API_KEY is missing in process.env');
            throw new Error('GEMINI_API_KEY não configurada no servidor.');
        }
        return new GoogleGenerativeAI(apiKey);
    }

    async parseExpense(input: string | { path: string, mimeType: string }): Promise<ExpenseData[]> {
        const prompt = `
            You are a financial assistant. Extract transaction details from the input.
            
            Return a valid JSON ARRAY of objects (even if only one item is found). 
            Each object must have:
            - description: string (clean merchant name or brief description)
            - amount: number (positive float, use total amount)
            - category: string (one of: 'Eletrônicos', 'Alimentação', 'Transporte', 'Casa', 'Serviços', 'Outros')
            - date: string (ISO 8601 date YYYY-MM-DD, assume current year if missing)
            - paymentMethod: string ('credit' or 'debit'. Default to 'debit' if unsure, use 'credit' if 'parcelado' or 'crédito' mentioned)
            - isPaid: boolean (true if debit, false if credit/invoice)
            - installments: number (1 for one-time, >1 if partial/parcelado)

            If the category is unclear, infer the best one.
            Do not wrap in markdown code blocks. Just the raw JSON string.
        `;

        try {
            // Using gemini-2.5-flash as confirmed by API capability check
            return await this.generateWithModel('gemini-2.5-flash', input, prompt);
        } catch (primaryError: any) {
            console.error('Primary model (gemini-2.5-flash) failed:', primaryError.message);
            try {
                // Fallback to gemini-pro just in case
                console.log('Attempting fallback to gemini-pro...');
                return await this.generateWithModel('gemini-pro', input, prompt);
            } catch (fallbackError: any) {
                console.error('Fallback model failed:', fallbackError.message);
                throw new Error(`Primary: ${primaryError.message} | Fallback: ${fallbackError.message}`);
            }
        }
    }

    private async generateWithModel(modelName: string, input: string | { path: string, mimeType: string }, prompt: string): Promise<ExpenseData[]> {
        const genAI = this.getClient();
        const model = genAI.getGenerativeModel({ model: modelName });

        let result;

        if (typeof input === 'string') {
            result = await model.generateContent([prompt, `Input text: "${input}"`]);
        } else {
            const fileData = fs.readFileSync(input.path);
            const imagePart = {
                inlineData: {
                    data: fileData.toString('base64'),
                    mimeType: input.mimeType,
                },
            };
            result = await model.generateContent([prompt, imagePart]);
        }

        const response = result.response;
        const text = response.text();
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const parsed = JSON.parse(jsonStr);
        return Array.isArray(parsed) ? parsed : [parsed];
    }

    async generateInsights(transactions: any[]): Promise<string> {
        if (!transactions || transactions.length === 0) {
            return "Ainda não há transações suficientes para gerar insights.";
        }

        const simplifiedTx = transactions.slice(0, 50).map(t => ({
            date: t.date,
            description: t.description,
            amount: t.amount,
            type: t.type,
            category: t.category
        }));

        const prompt = `
            Analyze these financial transactions (last 30 days) and provide 3 short, actionable insights or tips in Portuguese (Brazil).
            Focus on spending habits, recurring expenses, or saving opportunities.
            Use emojis. Keep it friendly and concise.
            
            Transactions:
            ${JSON.stringify(simplifiedTx)}
        `;

        try {
            const genAI = this.getClient();
            // Using gemini-2.5-flash as confirmed via curl
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error: any) {
            console.error('AI Insight Error:', error);
            // Simple generic error message now that we know the model
            return `Erro ao gerar insights: ${error.message || 'Erro desconhecido'}. Verifique a API Key e cotas.`;
        }
    }
}

export default new AiService();
