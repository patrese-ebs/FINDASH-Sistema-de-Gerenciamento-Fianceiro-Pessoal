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

import { MainLayoutComponent } from './components/layout/main-layout.component';

export const routes: Routes = [
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    {
        path: '',
        component: MainLayoutComponent,
        canActivate: [authGuard],
        children: [
            {
                path: 'dashboard',
                component: DashboardComponent
            },
            {
                path: 'transactions',
                loadComponent: () => import('./components/transactions/transactions.component').then(m => m.TransactionsComponent)
            },
            {
                path: 'credit-cards',
                loadComponent: () => import('./components/credit-cards/credit-cards.component').then(m => m.CreditCardsComponent)
            },
            {
                path: 'investments',
                loadComponent: () => import('./components/investments/investments.component').then(m => m.InvestmentsComponent)
            },
            {
                path: 'minha-conta',
                loadComponent: () => import('./components/minha-conta/minha-conta.component').then(m => m.MinhaContaComponent)
            },
            { path: 'goals', redirectTo: 'dashboard' }
        ]
    }
];
