import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { TransactionsComponent } from './components/transactions/transactions.component';
import { CreditCardsComponent } from './components/credit-cards/credit-cards.component';
import { InvestmentsComponent } from './components/investments/investments.component';
import { MinhaContaComponent } from './components/minha-conta/minha-conta.component';
import { AdminDashboardComponent } from './components/admin/admin-dashboard.component';
import { UserManagementComponent } from './components/admin/user-management.component';
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

const adminGuard = () => {
    const authService = inject(AuthService);
    if (authService.isAuthenticated() && authService.isAdmin()) {
        return true;
    }
    return false;
};

import { MainLayoutComponent } from './components/layout/main-layout.component';

export const routes: Routes = [
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
    { path: 'register', redirectTo: 'login' },
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
                component: TransactionsComponent
            },
            {
                path: 'credit-cards',
                component: CreditCardsComponent
            },
            {
                path: 'investments',
                component: InvestmentsComponent
            },
            {
                path: 'minha-conta',
                component: MinhaContaComponent
            },
            { path: 'goals', redirectTo: 'dashboard' },
            {
                path: 'admin',
                canActivate: [adminGuard],
                children: [
                    { path: '', component: AdminDashboardComponent },
                    { path: 'users', component: UserManagementComponent },
                ]
            }
        ]
    }
];

