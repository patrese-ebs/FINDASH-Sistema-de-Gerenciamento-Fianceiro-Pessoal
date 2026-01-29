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
            // Primary Model
            return await this.generateWithModel('gemini-1.5-flash', input, prompt);
        } catch (primaryError: any) {
            console.error('Primary model failed:', primaryError.message);
            try {
                // Fallback
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
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error: any) {
            console.error('AI Insight Error:', error);

            // Debugging: Try to list available models to see what IS allowed
            try {
                const apiKey = process.env.GEMINI_API_KEY;
                const https = require('https');

                const listModels = (): Promise<string> => {
                    return new Promise((resolve, reject) => {
                        https.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, (res: any) => {
                            let data = '';
                            res.on('data', (chunk: any) => data += chunk);
                            res.on('end', () => resolve(data));
                        }).on('error', (err: any) => reject(err));
                    });
                };

                const dataStr = await listModels();
                const listData = JSON.parse(dataStr);
                const availableModels = (listData.models || []).map((m: any) => m.name).join(', ');

                return `Erro: Modelo não encontrado. Modelos disponíveis: ${availableModels}`;
            } catch (listErr: any) {
                return `Erro ao gerar insights: ${error.message}. (Key: ${process.env.GEMINI_API_KEY ? 'Present' : 'Missing'}) - Falha ao listar modelos.`;
            }
        }
    }
}

export default new AiService();
