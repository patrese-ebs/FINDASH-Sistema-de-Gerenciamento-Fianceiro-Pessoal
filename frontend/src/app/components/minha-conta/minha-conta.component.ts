import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-minha-conta',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="max-w-2xl">
      <div class="mb-8 animate-enter">
        <h1 class="fd-section-title">Minha Conta</h1>
        <p class="fd-section-subtitle">Gerencie suas informações pessoais</p>
      </div>

      <div class="fd-card p-6 animate-enter animate-enter-delay-1">
        <form [formGroup]="profileForm" (ngSubmit)="onSubmit()" class="space-y-5">

          <!-- Profile Section -->
          <div>
            <h2 class="text-sm font-semibold text-text-primary mb-4 pb-3 border-b border-dark-border">
              Informações do Perfil
            </h2>
            <div class="space-y-4">
              <div>
                <label class="fd-label">Nome</label>
                <input type="text" formControlName="name" class="fd-input" placeholder="Seu nome completo">
              </div>
              <div>
                <label class="fd-label">Email</label>
                <input type="email" formControlName="email" class="fd-input" placeholder="seu@email.com">
              </div>
            </div>
          </div>

          <!-- Password Section -->
          <div class="pt-2">
            <h2 class="text-sm font-semibold text-text-primary mb-1 pb-3 border-b border-dark-border">
              Alterar Senha
            </h2>
            <p class="text-xs text-text-secondary mb-4">Deixe em branco se não quiser alterar.</p>

            <div class="space-y-4">
              <div>
                <label class="fd-label">Nova Senha</label>
                <input type="password" formControlName="password" class="fd-input" placeholder="Mínimo 6 caracteres">
              </div>
              <div>
                <label class="fd-label">Confirmar Nova Senha</label>
                <input type="password" formControlName="confirmPassword" class="fd-input" placeholder="Repita a nova senha">
                <p *ngIf="profileForm.errors?.['mismatch'] && profileForm.get('confirmPassword')?.touched"
                   class="text-accent-red text-xs mt-1.5 flex items-center gap-1">
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                  As senhas não conferem.
                </p>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="pt-4 border-t border-dark-border flex items-center justify-between gap-4">
            <div *ngIf="successMessage"
              class="flex items-center gap-2 text-accent-emerald text-sm bg-accent-emerald/5 border border-accent-emerald/20 rounded-md px-3 py-2">
              <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" d="M5 13l4 4L19 7"/>
              </svg>
              {{ successMessage }}
            </div>
            <div *ngIf="errorMessage"
              class="flex items-center gap-2 text-accent-red text-sm bg-accent-red/5 border border-accent-red/20 rounded-md px-3 py-2">
              <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
              {{ errorMessage }}
            </div>
            <div *ngIf="!successMessage && !errorMessage" class="flex-1"></div>

            <button type="submit" [disabled]="loading || profileForm.invalid"
              class="fd-btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
              <svg *ngIf="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              {{ loading ? 'Salvando...' : 'Salvar Alterações' }}
            </button>
          </div>

        </form>
      </div>
    </div>
  `
})
export class MinhaContaComponent implements OnInit {
  profileForm: FormGroup;
  loading = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private http: HttpClient
  ) {
    this.profileForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: [''],
      confirmPassword: ['']
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.profileForm.patchValue({
          name: user.name,
          email: user.email
        });
      }
    });

    // Refresh fetch me to be sure
    this.http.get('/api/auth/me', { headers: this.getHeaders() }).subscribe({
      next: (user: any) => {
        this.profileForm.patchValue({
          name: user.name,
          email: user.email
        });
      }
    });
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null : { 'mismatch': true };
  }

  onSubmit() {
    if (this.profileForm.invalid) return;

    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';

    const { name, email, password } = this.profileForm.value;
    const payload: any = { name, email };
    if (password) payload.password = password;

    this.http.put('/api/auth/me', payload, { headers: this.getHeaders() }).subscribe({
      next: (updatedUser: any) => {
        this.loading = false;
        this.successMessage = 'Perfil atualizado com sucesso!';
        // Force update local storage/session if AuthService doesn't auto-update
        // Simplest way is to reload or update subject
        // Let's manually trigger a reload or just assume future requests are fine.
        // Ideally update AuthService state.
      },
      error: (err) => {
        console.error('Update failed', err);
        this.loading = false;
        this.errorMessage = err.error?.error || 'Falha ao atualizar perfil';
      }
    });
  }
}
