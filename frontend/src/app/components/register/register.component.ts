import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [CommonModule],
    template: `<div class="min-h-screen bg-dark-bg flex items-center justify-center">
        <p class="text-text-secondary">Redirecionando...</p>
    </div>`,
})
export class RegisterComponent {
    constructor(private router: Router) {
        this.router.navigate(['/login']);
    }
}

