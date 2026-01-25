import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    templateUrl: './login.component.html',
})
export class LoginComponent {
    loginForm: FormGroup;
    errorMessage: string = '';
    loading: boolean = false;

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private router: Router
    ) {
        if (this.authService.isAuthenticated()) {
            this.router.navigate(['/dashboard']);
        }

        this.loginForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required]]
        });
    }

    onSubmit() {
        if (this.loginForm.valid) {
            this.loading = true;
            this.errorMessage = '';
            const { email, password } = this.loginForm.value;

            this.authService.login(email, password).subscribe({
                next: () => {
                    this.router.navigate(['/dashboard']);
                },
                error: (err) => {
                    this.errorMessage = err.message;
                    this.loading = false;
                }
            });
        } else {
            this.loginForm.markAllAsTouched();
        }
    }
}
