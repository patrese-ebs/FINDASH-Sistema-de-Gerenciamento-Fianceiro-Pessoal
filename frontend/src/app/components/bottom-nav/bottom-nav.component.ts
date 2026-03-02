import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
    selector: 'app-bottom-nav',
    standalone: true,
    imports: [CommonModule, RouterLink, RouterLinkActive],
    template: `
    <nav class="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-dark-border safe-area-bottom"
         style="background: linear-gradient(180deg, #0d1526 0%, #080d1a 100%);">
        <div class="flex items-center justify-around h-16">
            <a routerLink="/dashboard" routerLinkActive="active-tab"
               [routerLinkActiveOptions]="{exact: true}"
               class="bottom-tab group">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                    <rect x="3" y="3" width="7" height="7" rx="1"/>
                    <rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/>
                    <rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
                <span class="text-[10px] mt-0.5">Home</span>
            </a>

            <a routerLink="/transactions" routerLinkActive="active-tab"
               class="bottom-tab group">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round"
                          d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>
                </svg>
                <span class="text-[10px] mt-0.5">Transações</span>
            </a>

            <a routerLink="/credit-cards" routerLinkActive="active-tab"
               class="bottom-tab group">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                    <rect x="2" y="5" width="20" height="14" rx="2"/>
                    <path stroke-linecap="round" d="M2 10h20"/>
                </svg>
                <span class="text-[10px] mt-0.5">Cartões</span>
            </a>

            <a routerLink="/investments" routerLinkActive="active-tab"
               class="bottom-tab group">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                    <polyline points="16 7 22 7 22 13"/>
                </svg>
                <span class="text-[10px] mt-0.5">Investir</span>
            </a>

            <a routerLink="/minha-conta" routerLinkActive="active-tab"
               class="bottom-tab group">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                    <circle cx="12" cy="8" r="4"/>
                    <path stroke-linecap="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                </svg>
                <span class="text-[10px] mt-0.5">Perfil</span>
            </a>
        </div>
    </nav>
    `,
    styles: [`
        .bottom-tab {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 6px 12px;
            color: #8896ab;
            transition: color 0.2s;
            min-width: 56px;
            -webkit-tap-highlight-color: transparent;
        }
        .bottom-tab:active {
            transform: scale(0.92);
        }
        .bottom-tab.active-tab {
            color: #10b981;
        }
        .safe-area-bottom {
            padding-bottom: env(safe-area-inset-bottom, 0px);
        }
    `]
})
export class BottomNavComponent { }
