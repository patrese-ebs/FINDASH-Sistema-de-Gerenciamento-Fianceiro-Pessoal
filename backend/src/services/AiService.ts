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
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        console.log('Using Gemini API Key:', apiKey ? apiKey.substring(0, 5) + '...' : 'NONE');
        if (!apiKey) {
            console.warn('GEMINI_API_KEY is not set in environment variables.');
        }
        this.genAI = new GoogleGenerativeAI(apiKey || '');
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }

    async parseExpense(input: string | { path: string, mimeType: string }): Promise<ExpenseData[]> {
        let prompt = `
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
            // Primary Model: gemini-2.5-flash (Found in available models list)
            return await this.generateWithModel('gemini-2.5-flash', input, prompt);
        } catch (primaryError: any) {
            console.error('Primary model (gemini-2.5-flash) failed:', primaryError.message);

            try {
                // Fallback: gemini-2.0-flash
                console.log('Attempting fallback to gemini-2.0-flash...');
                return await this.generateWithModel('gemini-2.0-flash', input, prompt);
            } catch (fallbackError: any) {
                console.error('Fallback model failed:', fallbackError.message);
                throw new Error(`Primary: ${primaryError.message} | Fallback: ${fallbackError.message}`);
            }
        }
    }

    private async generateWithModel(modelName: string, input: string | { path: string, mimeType: string }, prompt: string): Promise<ExpenseData[]> {
        const model = this.genAI.getGenerativeModel({ model: modelName });
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
        // Ensure result is always an array
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

    } catch(error: any) {
        console.error('AI Insight Error:', error);
        // Return actual error for debugging
        return `Erro ao gerar insights: ${error.message || 'Erro desconhecido'}. Verifique a API Key e cotas.`;
    }
}
}

export default new AiService();
