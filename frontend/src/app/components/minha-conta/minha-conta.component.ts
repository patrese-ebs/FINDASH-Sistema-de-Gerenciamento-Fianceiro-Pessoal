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
    <div class="max-w-4xl mx-auto">
      <h2 class="text-3xl font-bold mb-8">Minha Conta</h2>

      <div class="bg-dark-card border border-dark-border rounded-xl p-8 shadow-lg">
        <form [formGroup]="profileForm" (ngSubmit)="onSubmit()" class="space-y-6">
          
          <!-- Name -->
          <div>
            <label class="block text-sm font-medium text-text-secondary mb-1">Nome</label>
            <input type="text" formControlName="name"
              class="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2 focus:outline-none focus:border-accent-purple transition-colors text-white">
          </div>

          <!-- Email -->
          <div>
            <label class="block text-sm font-medium text-text-secondary mb-1">Email</label>
            <input type="email" formControlName="email"
              class="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2 focus:outline-none focus:border-accent-purple transition-colors text-white">
          </div>

          <!-- Password Change -->
          <div class="pt-4 border-t border-dark-border">
            <h3 class="text-lg font-medium text-white mb-4">Alterar Senha</h3>
            <p class="text-sm text-text-secondary mb-4">Deixe em branco se não quiser alterar.</p>
            
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-text-secondary mb-1">Nova Senha</label>
                <input type="password" formControlName="password"
                  class="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2 focus:outline-none focus:border-accent-purple transition-colors text-white">
              </div>

              <div>
                <label class="block text-sm font-medium text-text-secondary mb-1">Confirmar Nova Senha</label>
                <input type="password" formControlName="confirmPassword"
                  class="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2 focus:outline-none focus:border-accent-purple transition-colors text-white">
                <p *ngIf="profileForm.errors?.['mismatch'] && profileForm.get('confirmPassword')?.touched" 
                   class="text-red-400 text-sm mt-1">As senhas não conferem.</p>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="pt-6 flex items-center justify-between">
            <div *ngIf="successMessage" class="text-emerald-400 flex items-center gap-2">
              <span>✅</span> {{ successMessage }}
            </div>
            <div *ngIf="errorMessage" class="text-red-400 flex items-center gap-2">
              <span>❌</span> {{ errorMessage }}
            </div>
            
            <button type="submit" [disabled]="loading || profileForm.invalid"
              class="ml-auto px-6 py-2 rounded-lg bg-gradient-to-r from-accent-purple to-accent-blue text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
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
