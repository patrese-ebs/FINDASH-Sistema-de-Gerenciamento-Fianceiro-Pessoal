import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
    selector: 'app-main-layout',
    standalone: true,
    imports: [RouterOutlet, SidebarComponent],
    template: `
    <div class="min-h-screen bg-dark-bg text-text-primary font-sans antialiased">
        <app-sidebar></app-sidebar>
        <div class="ml-64 p-8">
            <router-outlet></router-outlet>
        </div>
    </div>
  `
})
export class MainLayoutComponent { }
