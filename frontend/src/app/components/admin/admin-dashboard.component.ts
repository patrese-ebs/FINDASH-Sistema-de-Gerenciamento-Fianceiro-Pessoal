import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminService, AdminStats } from '../../services/admin.service';

@Component({
    selector: 'app-admin-dashboard',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit {
    stats: AdminStats | null = null;
    loading = true;
    error = '';

    constructor(private adminService: AdminService) { }

    ngOnInit() {
        this.loadStats();
    }

    loadStats() {
        this.loading = true;
        this.adminService.getStats().subscribe({
            next: (data) => {
                this.stats = data;
                this.loading = false;
            },
            error: (err) => {
                this.error = err.message;
                this.loading = false;
            }
        });
    }

    formatCurrency(value: number): string {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    }
}
