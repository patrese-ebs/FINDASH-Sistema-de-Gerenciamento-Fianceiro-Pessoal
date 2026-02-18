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
        <main class="ml-60 min-h-screen">
            <div class="p-8 max-w-7xl">
                <router-outlet></router-outlet>
            </div>
        </main>
    </div>
  `
})
export class MainLayoutComponent { }
