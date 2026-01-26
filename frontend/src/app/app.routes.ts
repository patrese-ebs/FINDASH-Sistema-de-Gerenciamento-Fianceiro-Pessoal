import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AuthService } from './services/auth';
import { inject } from '@angular/core';

const authGuard = () => {
    const authService = inject(AuthService);
    if (authService.isAuthenticated()) {
        return true;
    }
    authService.logout();
    return false;
};

export const routes: Routes = [
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    {
        path: 'dashboard',
        component: DashboardComponent,
        canActivate: [authGuard]
    },
    // Placeholders for future routes
    {
        path: 'transactions',
        loadComponent: () => import('./components/transactions/transactions.component').then(m => m.TransactionsComponent),
        canActivate: [authGuard]
    },
    {
        path: 'credit-cards', // Note: User might use /credit-cards or /cards 
        loadComponent: () => import('./components/credit-cards/credit-cards.component').then(m => m.CreditCardsComponent),
        canActivate: [authGuard]
    },
    {
        path: 'investments',
        loadComponent: () => import('./components/investments/investments.component').then(m => m.InvestmentsComponent),
        canActivate: [authGuard]
    },
    { path: 'goals', redirectTo: 'dashboard' },
];
