# FinDash - Frontend

Frontend moderno para o sistema de gerenciamento financeiro pessoal.

## 🎨 Tecnologias

- **Vite** - Build tool rápido e moderno
- **Vanilla JavaScript (ES6+)** - JavaScript puro com módulos
- **TailwindCSS** - Framework CSS utilitário
- **Chart.js** - Biblioteca de gráficos
- **Axios** - Cliente HTTP

## ✨ Funcionalidades Implementadas

### ✅ Autenticação
- [x] Página de Login
- [x] Página de Registro
- [x] Gerenciamento de sessão com JWT
- [x] Proteção de rotas
- [x] Logout

### ✅ Dashboard
- [x] Visão geral financeira
- [x] Cards de estatísticas (Saldo, Receitas, Despesas, Orçamento)
- [x] Gráfico de fluxo de caixa (últimos 6 meses)
- [x] Gráfico de breakdown de despesas (donut chart)
- [x] Insights com IA (placeholder)
- [x] Filtros por mês/ano

### ✅ Cartões de Crédito
- [x] Listagem de cartões
- [x] Visualização de limite e uso
- [x] **Sistema de parcelas (1-48x)**
- [x] Cálculo automático do valor da parcela
- [x] Fatura mensal com todas as parcelas
- [x] Display: "Produto - Parcela 3/12"
- [x] Modal para adicionar despesas
- [x] Indicador de melhor dia de compra

## 🚀 Como Executar

### 1. Instalar Dependências

```bash
npm install
```

### 2. Iniciar o Servidor de Desenvolvimento

```bash
npm run dev
```

O frontend estará disponível em `http://localhost:4200`

### 3. Build para Produção

```bash
npm run build
```

Os arquivos otimizados estarão em `dist/`

## 📁 Estrutura do Projeto

```
frontend/
├── src/
│   ├── css/
│   │   └── style.css          # Estilos com TailwindCSS
│   ├── js/
│   │   ├── api.js             # Cliente Axios
│   │   ├── auth.js            # Serviço de autenticação
│   │   └── services/
│   │       ├── creditCardService.js
│   │       └── dashboardService.js
│   └── assets/                # Imagens e recursos
├── index.html                 # Página inicial (redireciona)
├── login.html                 # Página de login
├── register.html              # Página de registro
├── dashboard.html             # Dashboard principal
├── credit-cards.html          # Gerenciamento de cartões
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## 🎨 Design

O frontend segue um tema dark moderno com:

### Cores
- **Background**: `#0f0f1a`
- **Cards**: `#1a1a2e`
- **Borders**: `#2a2a3e`
- **Accent Purple**: `#8b5cf6`
- **Accent Blue**: `#3b82f6`
- **Accent Gold**: `#fbbf24`

### Componentes
- Cards com glassmorphism
- Gradientes vibrantes
- Animações suaves (fade-in, slide-in)
- Gráficos interativos
- Progress bars circulares
- Hover effects

## 🔌 Integração com Backend

O frontend se conecta automaticamente ao backend em `http://localhost:3000/api`

### Configuração da API

Edite `src/js/api.js` para alterar a URL da API:

```javascript
const API_URL = 'http://localhost:3000/api';
```

### Autenticação

O token JWT é armazenado no `localStorage` e enviado automaticamente em todas as requisições através de um interceptor Axios.

## 💳 Sistema de Parcelas

A funcionalidade principal do sistema permite:

1. **Adicionar Despesa Parcelada**:
   - Selecionar cartão
   - Informar descrição e valor total
   - Escolher número de parcelas (1-48x)
   - Sistema calcula automaticamente o valor da parcela

2. **Visualizar Fatura**:
   - Mostra todas as parcelas que vencem no mês
   - Display: "TV Samsung - Parcela 3/12"
   - Valor individual de cada parcela

3. **Acompanhar Limite**:
   - Visualização do limite total
   - Limite disponível
   - Percentual de uso

## 📊 Gráficos

### Cash Flow (Fluxo de Caixa)
- Gráfico de barras
- Compara receitas vs despesas
- Últimos 6 meses

### Expense Breakdown
- Gráfico de donut
- Mostra distribuição por categoria
- Percentuais calculados automaticamente

## 🔐 Segurança

- Token JWT em todas as requisições
- Redirecionamento automático para login se não autenticado
- Logout limpa sessão completamente
- Interceptor trata erros 401 automaticamente

## 🚧 Próximas Funcionalidades

- [ ] Página de Transações (Receitas/Despesas)
- [ ] Página de Investimentos
- [ ] Página de Metas Financeiras
- [ ] Integração com IA para:
  - [ ] Upload de imagens de contas
  - [ ] Parsing de texto para lançamentos
  - [ ] Geração de relatórios inteligentes
- [ ] Notificações de vencimento
- [ ] Exportação de relatórios (PDF/Excel)
- [ ] Modo claro/escuro
- [ ] Responsividade mobile

## 🎯 Como Usar

1. **Primeiro Acesso**:
   - Acesse `http://localhost:4200`
   - Clique em "Registre-se"
   - Crie sua conta

2. **Adicionar Cartão de Crédito**:
   - Vá para "Cartões"
   - Clique em "+ Nova Despesa"
   - Preencha os dados do cartão

3. **Lançar Compra Parcelada**:
   - Clique em "+ Nova Despesa"
   - Selecione o cartão
   - Informe descrição, valor e parcelas
   - O sistema calcula automaticamente

4. **Visualizar Fatura**:
   - As parcelas aparecem automaticamente na fatura do mês
   - Formato: "Produto - Parcela X/Y"

## 📝 Notas

- O frontend usa ES6 modules, então precisa ser servido através do Vite
- Não abra os arquivos HTML diretamente no navegador
- Sempre use `npm run dev` para desenvolvimento

## 🐛 Troubleshooting

**Erro de CORS**:
- Verifique se o backend está rodando em `http://localhost:3000`
- Verifique a configuração de CORS no backend

**Página em branco**:
- Abra o console do navegador (F12)
- Verifique se há erros JavaScript
- Certifique-se de que o backend está rodando

**Token expirado**:
- Faça logout e login novamente
- O token tem validade de 7 dias

## 📄 Licença

ISC
