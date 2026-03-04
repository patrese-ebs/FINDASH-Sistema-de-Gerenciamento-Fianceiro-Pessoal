import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [CommonModule, RouterLink, RouterLinkActive],
    templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
    constructor(private authService: AuthService) { }

    get isAdmin(): boolean {
        return this.authService.isAdmin();
    }

    logout() {
        this.authService.logout();
    }
}

