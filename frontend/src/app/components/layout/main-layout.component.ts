import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { BottomNavComponent } from '../bottom-nav/bottom-nav.component';

@Component({
    selector: 'app-main-layout',
    standalone: true,
    imports: [RouterOutlet, SidebarComponent, BottomNavComponent],
    template: `
    <div class="min-h-screen bg-dark-bg text-text-primary font-sans antialiased">
        <!-- Desktop Sidebar (hidden on mobile) -->
        <div class="hidden md:block">
            <app-sidebar></app-sidebar>
        </div>

        <!-- Main Content: ml-60 on desktop, full width on mobile -->
        <main class="md:ml-60 min-h-screen">
            <div class="p-4 md:p-8 max-w-7xl pb-24 md:pb-8">
                <router-outlet></router-outlet>
            </div>
        </main>

        <!-- Mobile Bottom Nav (hidden on desktop) -->
        <app-bottom-nav></app-bottom-nav>
    </div>
  `
})
export class MainLayoutComponent { }
