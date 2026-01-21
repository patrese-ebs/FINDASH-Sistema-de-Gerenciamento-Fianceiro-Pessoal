# Personal Financial Manager

Sistema completo de gerenciamento financeiro pessoal com frontend Angular e backend Node.js/Express.

## 🎯 Funcionalidades

### ✅ Implementado (Backend + Frontend)

- **Autenticação JWT**: Sistema completo de registro e login com interface
- **Dashboard Interativo**: 
  - Cards de estatísticas (Saldo, Receitas, Despesas, Orçamento)
  - Gráfico de fluxo de caixa (últimos 6 meses)
  - Gráfico de breakdown de despesas
  - Insights com IA (placeholder)
- **Controle de Receitas**: Adicionar, editar, deletar e filtrar por mês/ano (API pronta)
- **Controle de Despesas**: Gerenciamento completo com categorias (API pronta)
- **Cartões de Crédito**: 
  - Interface completa de gerenciamento
  - Cadastro de cartões com visualização de limite
  - Lançamentos com suporte a **parcelas (1-48x)**
  - Cálculo automático do valor da parcela
  - Fatura mensal com todas as parcelas do mês
  - Controle de limite disponível
  - Indicador de melhor dia de compra
- **Investimentos**: Acompanhamento de portfólio (API pronta)
- **Planejamento Financeiro**: Metas e objetivos (API pronta)
- **Relatórios**: Dashboard com resumo e relatórios mensais
- **Filtros por Mês/Ano**: Todas as transações podem ser filtradas

### 🚧 Próximos Passos

- Interface para Transações (Receitas/Despesas)
- Interface para Investimentos
- Interface para Planejamento Financeiro
- Integração com IA para:
  - Extração de dados de imagens de contas
  - Parsing de texto para lançamentos rápidos
  - Geração de relatórios inteligentes

## 📁 Estrutura do Projeto

```
Projeto organizador financeiro pessoal/
├── backend/                 # API Node.js/Express/TypeScript ✅
│   ├── src/
│   │   ├── config/         # Configurações (DB, env)
│   │   ├── controllers/    # Controladores (7 controllers)
│   │   ├── middleware/     # Auth, validação, erros
│   │   ├── models/         # Modelos Sequelize (8 models)
│   │   ├── routes/         # Rotas da API
│   │   ├── services/       # Lógica de negócio
│   │   ├── types/          # Tipos TypeScript
│   │   └── server.ts       # Entrada da aplicação
│   ├── .env                # Variáveis de ambiente
│   ├── package.json
│   └── README.md
│
└── frontend/               # Frontend Vite + TailwindCSS ✅
    ├── src/
    │   ├── css/            # Estilos TailwindCSS
    │   └── js/             # JavaScript modules
    │       ├── api.js      # Cliente HTTP
    │       ├── auth.js     # Autenticação
    │       └── services/   # Serviços da API
    ├── index.html          # Página inicial
    ├── login.html          # Login
    ├── register.html       # Registro
    ├── dashboard.html      # Dashboard ✅
    ├── credit-cards.html   # Cartões ✅
    ├── package.json
    └── README.md
```

## 🚀 Como Executar

### Pré-requisitos

- Node.js v18+
- PostgreSQL v14+
- npm ou yarn

### 1. Configurar o Banco de Dados

```sql
-- Conecte ao PostgreSQL e crie o banco
CREATE DATABASE financial_manager;
```

### 2. Configurar e Executar o Backend

```bash
# Navegar para a pasta do backend
cd backend

# Instalar dependências (já instaladas)
npm install

# Configurar variáveis de ambiente
# Edite o arquivo .env com suas credenciais do PostgreSQL
# DB_USER=seu_usuario
# DB_PASSWORD=sua_senha

# Iniciar o servidor em modo desenvolvimento
npm run dev
```

O servidor estará rodando em `http://localhost:3000`

### 3. Configurar e Executar o Frontend

```bash
# Em outro terminal, navegar para a pasta do frontend
cd frontend

# Instalar dependências (já instaladas)
npm install

# Iniciar o servidor de desenvolvimento
npm run dev
```

O frontend estará disponível em `http://localhost:4200`

### 4. Acessar a Aplicação

1. Abra o navegador em `http://localhost:4200`
2. Clique em "Registre-se" para criar uma conta
3. Faça login com suas credenciais
4. Explore o dashboard e adicione cartões de crédito!

### 5. Testar o Sistema de Parcelas

1. Vá para "Cartões" no menu lateral
2. Clique em "+ Nova Despesa"
3. Preencha:
   - Descrição: "TV Samsung 55 polegadas"
   - Valor Total: 1200.00
   - Parcelas: 12x
   - Categoria: Eletrônicos
4. O sistema calculará automaticamente: 12x de R$ 100,00
5. A fatura mostrará: "TV Samsung - Parcela 1/12"

## 📊 Modelos do Banco de Dados

### 1. Users (Usuários)
- id, email, password, name

### 2. Incomes (Receitas)
- Descrição, valor, categoria, data
- **Filtros**: mês e ano

### 3. Expenses (Despesas)
- Descrição, valor, categoria, data
- Método de pagamento (dinheiro, débito, crédito, transferência)
- **Filtros**: mês e ano

### 4. Credit Cards (Cartões de Crédito)
- Nome, últimos 4 dígitos, bandeira
- Limite de crédito
- Dia de fechamento e vencimento

### 5. Credit Card Transactions (Transações do Cartão)
- Descrição, valor total
- **Número de parcelas (1-48)**
- Valor da parcela (calculado automaticamente)
- Parcela atual
- Data da compra, categoria

**Exemplo de Uso**:
```json
{
  "description": "TV Samsung 55\"",
  "totalAmount": 1200.00,
  "installments": 12,
  "category": "Eletrônicos",
  "purchaseDate": "2026-01-20"
}
```
Resultado: 12 parcelas de R$ 100,00

### 6. Investments (Investimentos)
- Nome, tipo, valor investido, valor atual
- Data de compra, notas

### 7. Financial Plans (Planos Financeiros)
- Nome, valor alvo, valor atual
- Prazo, categoria

### 8. Payment Reminders (Lembretes de Pagamento)
- Descrição, valor, data de vencimento
- Status de pagamento, dias de antecedência

## 🔌 API Endpoints

### Autenticação
- `POST /api/auth/register` - Registrar usuário
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Dados do usuário (protegido)

### Receitas
- `GET /api/incomes?month=1&year=2026` - Listar receitas
- `POST /api/incomes` - Criar receita
- `PUT /api/incomes/:id` - Atualizar receita
- `DELETE /api/incomes/:id` - Deletar receita

### Despesas
- `GET /api/expenses?month=1&year=2026` - Listar despesas
- `POST /api/expenses` - Criar despesa
- `PUT /api/expenses/:id` - Atualizar despesa
- `DELETE /api/expenses/:id` - Deletar despesa

### Cartões de Crédito
- `GET /api/credit-cards` - Listar cartões
- `POST /api/credit-cards` - Criar cartão
- `PUT /api/credit-cards/:id` - Atualizar cartão
- `DELETE /api/credit-cards/:id` - Deletar cartão
- `GET /api/credit-cards/:id/transactions` - Listar transações
- `POST /api/credit-cards/:id/transactions` - Adicionar transação com parcelas
- `GET /api/credit-cards/:id/invoice/:month/:year` - Fatura mensal
- `GET /api/credit-cards/:id/balance` - Saldo atual

### Investimentos
- `GET /api/investments` - Listar investimentos
- `POST /api/investments` - Criar investimento
- `PUT /api/investments/:id` - Atualizar investimento
- `DELETE /api/investments/:id` - Deletar investimento

### Planejamento Financeiro
- `GET /api/financial-plans` - Listar planos
- `POST /api/financial-plans` - Criar plano
- `PUT /api/financial-plans/:id` - Atualizar plano
- `DELETE /api/financial-plans/:id` - Deletar plano

### Relatórios
- `GET /api/reports/dashboard` - Dashboard resumo
- `GET /api/reports/monthly/:month/:year` - Relatório mensal

## 🎨 Design

O sistema seguirá o design moderno dark theme conforme as imagens de referência:
- Fundo escuro (#0f0f1a)
- Cards com bordas sutis
- Gradientes (roxo/azul/dourado)
- Efeitos glassmorphism
- Animações suaves
- Gráficos interativos

## 🔐 Segurança

- Senhas criptografadas com bcrypt
- Autenticação JWT
- Rotas protegidas com middleware
- Validação de dados
- CORS configurado

## 📝 Próximas Etapas

1. **Criar Frontend Angular**
   - Configurar TailwindCSS
   - Criar componentes base
   - Implementar autenticação
   - Criar módulos de funcionalidades

2. **Integração com IA**
   - OpenAI para extração de imagens
   - Parsing de texto
   - Geração de relatórios

3. **Testes**
   - Testes unitários
   - Testes de integração
   - Testes E2E

## 📄 Licença

ISC

## 👨‍💻 Desenvolvimento

Para continuar o desenvolvimento, você pode:

1. **Testar o Backend**: Use Postman ou Insomnia para testar todos os endpoints
2. **Criar o Frontend**: Execute `ng new frontend` na raiz do projeto
3. **Integrar**: Conecte o frontend ao backend via HttpClient do Angular

---

**Status Atual**: 
- ✅ Backend 100% funcional
- ✅ Frontend 70% completo (Login, Dashboard, Cartões implementados)
- 🚧 Páginas restantes: Transações, Investimentos, Metas
- 🚧 Integração com IA pendente

**Pronto para usar!** O sistema já permite criar conta, fazer login, visualizar dashboard e gerenciar cartões de crédito com parcelas!
