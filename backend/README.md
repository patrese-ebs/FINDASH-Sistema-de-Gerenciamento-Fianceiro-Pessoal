# Personal Financial Manager - Backend

Backend API for the Personal Financial Management System built with Node.js, Express, TypeScript, and PostgreSQL.

## Features

- 🔐 **Authentication**: JWT-based authentication
- 💰 **Income & Expense Tracking**: Month-by-month financial tracking
- 💳 **Credit Card Management**: Track cards, transactions, and installments (1-48x)
- 📊 **Investments**: Monitor investment portfolio
- 🎯 **Financial Planning**: Set and track financial goals
- 📈 **Reports**: Dashboard and monthly reports
- 🤖 **AI Integration**: Ready for image/text extraction (OpenAI)

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Configure your `.env` file with your database credentials and other settings.

4. Create the PostgreSQL database:
```sql
CREATE DATABASE financial_manager;
```

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Income
- `GET /api/incomes?month=1&year=2026` - Get incomes (with optional filters)
- `POST /api/incomes` - Create income
- `PUT /api/incomes/:id` - Update income
- `DELETE /api/incomes/:id` - Delete income

### Expenses
- `GET /api/expenses?month=1&year=2026` - Get expenses (with optional filters)
- `POST /api/expenses` - Create expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

### Credit Cards
- `GET /api/credit-cards` - Get all credit cards
- `POST /api/credit-cards` - Create credit card
- `PUT /api/credit-cards/:id` - Update credit card
- `DELETE /api/credit-cards/:id` - Delete credit card
- `GET /api/credit-cards/:id/transactions` - Get card transactions
- `POST /api/credit-cards/:id/transactions` - Add transaction with installments
- `GET /api/credit-cards/:id/invoice/:month/:year` - Get monthly invoice
- `GET /api/credit-cards/:id/balance` - Get current balance

### Investments
- `GET /api/investments` - Get all investments
- `POST /api/investments` - Create investment
- `PUT /api/investments/:id` - Update investment
- `DELETE /api/investments/:id` - Delete investment

### Financial Plans
- `GET /api/financial-plans` - Get all plans
- `POST /api/financial-plans` - Create plan
- `PUT /api/financial-plans/:id` - Update plan
- `DELETE /api/financial-plans/:id` - Delete plan

### Reports
- `GET /api/reports/dashboard` - Get dashboard summary
- `GET /api/reports/monthly/:month/:year` - Get monthly report

## Database Schema

The application uses 8 main tables:
- `users` - User accounts
- `incomes` - Income transactions
- `expenses` - Expense transactions
- `credit_cards` - Credit card information
- `credit_card_transactions` - Credit card purchases with installments
- `investments` - Investment portfolio
- `financial_plans` - Financial goals
- `payment_reminders` - Payment due dates

## Project Structure

```
backend/
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Request handlers
│   ├── middleware/     # Custom middleware
│   ├── models/         # Database models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── types/          # TypeScript types
│   └── server.ts       # Application entry point
├── .env.example        # Environment variables template
├── package.json
└── tsconfig.json
```

## License

ISC
