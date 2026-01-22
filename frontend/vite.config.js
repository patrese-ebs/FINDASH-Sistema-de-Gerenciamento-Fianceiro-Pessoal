import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        port: 4200,
        open: true,
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
        rollupOptions: {
            input: {
                main: 'index.html',
                login: 'login.html',
                register: 'register.html',
                dashboard: 'dashboard.html',
                transactions: 'transactions.html',
                creditCards: 'credit-cards.html',
                forgotPassword: 'forgot-password.html',
                resetPassword: 'reset-password.html',
            },
        },
    },
});
