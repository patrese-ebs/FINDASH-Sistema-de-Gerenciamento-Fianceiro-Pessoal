import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import { sanitizePromptInput } from './sanitize';

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

    private getCurrentDate(): string {
        return new Date().toISOString().split('T')[0];
    }

    private formatCurrency(value: number): string {
        return `R$ ${value.toFixed(2).replace('.', ',')}`;
    }

    async parseExpense(input: string | { path: string, mimeType: string }): Promise<ExpenseData[]> {
        const today = this.getCurrentDate();

        const prompt = `Você é um assistente financeiro brasileiro especializado em extrair dados de transações financeiras.

DATA DE HOJE: ${today}

TAREFA: Extraia os dados de transações financeiras da entrada fornecida e retorne um JSON válido.

REGRAS DE CATEGORIAS:
- "Alimentação": restaurantes, iFood, Rappi, mercados, supermercados, padarias, lanchonetes, delivery de comida
- "Transporte": Uber, 99, combustível, estacionamento, pedágio, passagens, ônibus, metrô
- "Casa": aluguel, condomínio, energia, água, gás, internet, manutenção, móveis, decoração
- "Eletrônicos": celulares, computadores, TVs, games, acessórios eletrônicos, gadgets
- "Serviços": streaming (Netflix, Spotify, etc.), assinaturas, seguros, academia, salão, plano de saúde
- "Outros": tudo que não se encaixar nas categorias acima

REGRAS DE PAGAMENTO:
- Se mencionar "parcelado", "parcela", "crédito", "x vezes" → paymentMethod: "credit", isPaid: false
- Se mencionar "débito", "pix", "dinheiro", "à vista" → paymentMethod: "debit", isPaid: true
- Se não especificar → paymentMethod: "debit", isPaid: true

REGRAS DE DATA:
- Se a data não tiver ano, use o ano de ${today.split('-')[0]}
- Se não houver data, use ${today}
- Formato de saída: YYYY-MM-DD

FORMATO DE SAÍDA (JSON array, sem markdown):
[
  {
    "description": "Nome limpo do estabelecimento ou descrição breve",
    "amount": 0.00,
    "category": "Categoria",
    "date": "YYYY-MM-DD",
    "paymentMethod": "credit ou debit",
    "isPaid": true ou false,
    "installments": 1
  }
]

EXEMPLOS:

Entrada: "Gastei 150 reais no iFood ontem"
Saída: [{"description":"iFood","amount":150.00,"category":"Alimentação","date":"${today}","paymentMethod":"debit","isPaid":true,"installments":1}]

Entrada: "Comprei um notebook de 3500 em 10x no cartão dia 05/01"
Saída: [{"description":"Notebook","amount":3500.00,"category":"Eletrônicos","date":"${today.split('-')[0]}-01-05","paymentMethod":"credit","isPaid":false,"installments":10}]

Entrada: "Netflix 39,90 e Spotify 21,90"
Saída: [{"description":"Netflix","amount":39.90,"category":"Serviços","date":"${today}","paymentMethod":"debit","isPaid":true,"installments":1},{"description":"Spotify","amount":21.90,"category":"Serviços","date":"${today}","paymentMethod":"debit","isPaid":true,"installments":1}]

Retorne APENAS o JSON array, sem explicações nem blocos de código markdown.`;

        try {
            return await this.generateWithModel('gemini-2.5-flash', input, prompt);
        } catch (primaryError: any) {
            console.error('Primary model (gemini-2.5-flash) failed:', primaryError.message);
            try {
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
            result = await model.generateContent([prompt, `Texto do usuário: "${sanitizePromptInput(input)}"`]);
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

        // Separar receitas e despesas
        const expenses = transactions.filter(t => t.type === 'expense');
        const incomes = transactions.filter(t => t.type === 'income');

        const totalExpenses = expenses.reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const totalIncomes = incomes.reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const balance = totalIncomes - totalExpenses;

        // Agregar por categoria (envia resumo, não dados brutos)
        const categoryMap: Record<string, { total: number; count: number }> = {};
        expenses.forEach(t => {
            const cat = t.category || 'Outros';
            if (!categoryMap[cat]) categoryMap[cat] = { total: 0, count: 0 };
            categoryMap[cat].total += Number(t.amount || 0);
            categoryMap[cat].count++;
        });

        const categoryBreakdown = Object.entries(categoryMap)
            .sort(([, a], [, b]) => b.total - a.total)
            .map(([cat, data]) => `- ${cat}: ${this.formatCurrency(data.total)} (${data.count} transações)`)
            .join('\n');

        // Top 5 maiores gastos
        const topExpenses = expenses
            .sort((a, b) => Number(b.amount) - Number(a.amount))
            .slice(0, 5)
            .map(t => `- ${t.description}: ${this.formatCurrency(Number(t.amount))} (${t.category || 'Outros'})`)
            .join('\n');

        const prompt = `Você é um consultor financeiro brasileiro, amigável e direto. Fale como se estivesse conversando com um amigo próximo.

DADOS FINANCEIROS DO PERÍODO:
📊 Receita total: ${this.formatCurrency(totalIncomes)}
💸 Despesa total: ${this.formatCurrency(totalExpenses)}
💰 Saldo: ${this.formatCurrency(balance)} ${balance >= 0 ? '(positivo ✅)' : '(negativo ⚠️)'}
📈 Percentual gasto da renda: ${totalIncomes > 0 ? ((totalExpenses / totalIncomes) * 100).toFixed(1) : '0'}%

GASTOS POR CATEGORIA:
${categoryBreakdown || 'Nenhum gasto registrado.'}

TOP 5 MAIORES GASTOS:
${topExpenses || 'Nenhum gasto registrado.'}

INSTRUÇÕES:
Gere exatamente 3 insights numerados sobre a situação financeira acima.

Formato obrigatório para cada insight:
[número]. [emoji] [Título curto em negrito]
[Análise de 1-2 linhas com dica prática e valores específicos]

Regras:
- Use os valores reais fornecidos acima (não invente números)
- Foque em: padrões de gastos, economia possível e alertas importantes
- Se o saldo estiver negativo, o primeiro insight DEVE ser um alerta sobre isso
- Seja específico: em vez de "gaste menos", diga "reduzir Alimentação de R$ X para R$ Y economizaria Z por mês"
- Use emojis relevantes
- Máximo de 3 linhas por insight`;

        try {
            const genAI = this.getClient();
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error: any) {
            console.error('AI Insight Error:', error);
            return `Erro ao gerar insights: ${error.message || 'Erro desconhecido'}. Verifique a API Key e cotas.`;
        }
    }

    async searchDebt(query: string, userId: string): Promise<string> {
        try {
            const { Expense, CreditCard, CreditCardTransaction, CreditCardInvoice } = await import('../models');

            // Buscar dados em paralelo (Promise.all) para reduzir tempo de espera
            const [expenses, creditCards] = await Promise.all([
                Expense.findAll({
                    where: { userId, isPaid: false },
                    order: [['date', 'DESC']],
                    limit: 50
                }),
                CreditCard.findAll({
                    where: { userId },
                    include: [{
                        model: CreditCardTransaction,
                        as: 'transactions'
                    }]
                })
            ]);

            // Buscar faturas apenas se houver cartões
            const cardIds = creditCards.map(c => c.id);
            const invoices = cardIds.length > 0
                ? await CreditCardInvoice.findAll({ where: { creditCardId: cardIds } })
                : [];

            // Converter dados para texto legível (não JSON bruto)
            const expenseLines = expenses.length > 0
                ? expenses.map(e =>
                    `- ${e.description} | ${this.formatCurrency(Number(e.amount))} | Categoria: ${e.category} | Data: ${e.date} | Status: Pendente`
                ).join('\n')
                : 'Nenhuma despesa pendente encontrada.';

            const cardLines = creditCards.map(card => {
                const transactions = (card as any).transactions || [];
                const cardInvoices = invoices.filter(inv => inv.creditCardId === card.id);

                const txLines = transactions.length > 0
                    ? transactions.map((t: any) =>
                        `  • ${t.description} | Total: ${this.formatCurrency(Number(t.totalAmount))} | Parcela: ${t.currentInstallment}/${t.installments} | Data: ${t.purchaseDate} | Categoria: ${t.category}`
                    ).join('\n')
                    : '  Nenhuma transação registrada.';

                const invLines = cardInvoices.length > 0
                    ? cardInvoices.map(inv =>
                        `  • ${String(inv.month).padStart(2, '0')}/${inv.year}: ${this.formatCurrency(Number(inv.amount))} ${inv.isPaid ? '✅ Paga' : '⏳ Pendente'}`
                    ).join('\n')
                    : '  Nenhuma fatura registrada.';

                return `🏦 Cartão: ${card.name} (final ${card.lastFourDigits}) | Limite: ${this.formatCurrency(Number(card.creditLimit))}
  Transações:
${txLines}
  Faturas:
${invLines}`;
            }).join('\n\n');

            const prompt = `Você é um assistente financeiro pessoal brasileiro chamado "FinBot". Sua função é EXCLUSIVAMENTE responder perguntas sobre as finanças do usuário.

REGRA IMPORTANTE: Se a pergunta NÃO for relacionada a finanças, dívidas, gastos, receitas, cartões ou dinheiro, responda:
"🤖 Desculpe, sou especializado em finanças! Posso te ajudar com dúvidas sobre seus gastos, dívidas, cartões e controle financeiro. Como posso ajudar?"

PERGUNTA DO USUÁRIO: "${sanitizePromptInput(query)}"

DADOS FINANCEIROS DO USUÁRIO:

📋 DESPESAS PENDENTES (não pagas):
${expenseLines}

💳 CARTÕES DE CRÉDITO:
${cardLines || 'Nenhum cartão cadastrado.'}

INSTRUÇÕES DE RESPOSTA:
Responda sempre neste formato:

📌 **Resumo**: [resposta direta em 1 linha]

📊 **Detalhes**:
[lista com os dados encontrados, use bullet points]

💡 **Dica**: [1 sugestão prática relacionada à pergunta]

Regras:
- Use os dados fornecidos acima (não invente valores)
- Se não encontrar nenhum registro correspondente, diga claramente e sugira alternativas de busca
- Valores sempre no formato R$ X.XXX,XX
- Seja objetivo, máximo 15 linhas no total
- Use emojis com moderação para facilitar a leitura`;

            const genAI = this.getClient();
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error: any) {
            console.error('AI Debt Search Error:', error);
            return `❌ Erro ao pesquisar: ${error.message || 'Erro desconhecido'}. Verifique a conexão.`;
        }
    }
}

export default new AiService();

