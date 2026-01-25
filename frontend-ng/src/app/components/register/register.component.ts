import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    templateUrl: './register.component.html',
})
export class RegisterComponent {
    registerForm: FormGroup;
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

        this.registerForm = this.fb.group({
            name: ['', [Validators.required, Validators.minLength(2)]],
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(6)]]
        });
    }

    onSubmit() {
        if (this.registerForm.valid) {
            this.loading = true;
            this.errorMessage = '';
            const { name, email, password } = this.registerForm.value;

            this.authService.register(email, password, name).subscribe({
                next: () => {
                    this.router.navigate(['/dashboard']);
                },
                error: (err) => {
                    this.errorMessage = err.message;
                    this.loading = false;
                }
            });
        } else {
            this.registerForm.markAllAsTouched();
        }
    }
}
