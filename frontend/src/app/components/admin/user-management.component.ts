import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService, AdminUser } from '../../services/admin.service';

@Component({
    selector: 'app-user-management',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './user-management.component.html',
})
export class UserManagementComponent implements OnInit {
    users: AdminUser[] = [];
    loading = true;
    error = '';
    successMessage = '';

    // Modal state
    showModal = false;
    modalMode: 'create' | 'edit' | 'reset-password' = 'create';
    modalTitle = '';

    // Form data
    formData = {
        name: '',
        email: '',
        password: '',
        role: 'user' as 'user' | 'admin',
    };
    formError = '';
    formLoading = false;
    editingUserId = '';

    constructor(private adminService: AdminService) { }

    ngOnInit() {
        this.loadUsers();
    }

    loadUsers() {
        this.loading = true;
        this.adminService.getUsers().subscribe({
            next: (data) => {
                this.users = data;
                this.loading = false;
            },
            error: (err) => {
                this.error = err.message;
                this.loading = false;
            }
        });
    }

    openCreateModal() {
        this.modalMode = 'create';
        this.modalTitle = 'Criar Novo Usuário';
        this.formData = { name: '', email: '', password: '', role: 'user' };
        this.formError = '';
        this.showModal = true;
    }

    openEditModal(user: AdminUser) {
        this.modalMode = 'edit';
        this.modalTitle = 'Editar Usuário';
        this.editingUserId = user.id;
        this.formData = { name: user.name, email: user.email, password: '', role: user.role };
        this.formError = '';
        this.showModal = true;
    }

    openResetPasswordModal(user: AdminUser) {
        this.modalMode = 'reset-password';
        this.modalTitle = 'Resetar Senha';
        this.editingUserId = user.id;
        this.formData = { name: user.name, email: user.email, password: '', role: user.role };
        this.formError = '';
        this.showModal = true;
    }

    closeModal() {
        this.showModal = false;
        this.formError = '';
    }

    submitForm() {
        this.formLoading = true;
        this.formError = '';

        if (this.modalMode === 'create') {
            this.adminService.createUser({
                name: this.formData.name,
                email: this.formData.email,
                password: this.formData.password,
                role: this.formData.role,
            }).subscribe({
                next: () => {
                    this.showModal = false;
                    this.formLoading = false;
                    this.showSuccess('Usuário criado com sucesso!');
                    this.loadUsers();
                },
                error: (err) => {
                    this.formError = err.message;
                    this.formLoading = false;
                }
            });
        } else if (this.modalMode === 'edit') {
            const updates: any = {};
            if (this.formData.name) updates.name = this.formData.name;
            if (this.formData.email) updates.email = this.formData.email;
            if (this.formData.role) updates.role = this.formData.role;

            this.adminService.updateUser(this.editingUserId, updates).subscribe({
                next: () => {
                    this.showModal = false;
                    this.formLoading = false;
                    this.showSuccess('Usuário atualizado com sucesso!');
                    this.loadUsers();
                },
                error: (err) => {
                    this.formError = err.message;
                    this.formLoading = false;
                }
            });
        } else if (this.modalMode === 'reset-password') {
            this.adminService.resetUserPassword(this.editingUserId, this.formData.password).subscribe({
                next: () => {
                    this.showModal = false;
                    this.formLoading = false;
                    this.showSuccess('Senha resetada com sucesso!');
                },
                error: (err) => {
                    this.formError = err.message;
                    this.formLoading = false;
                }
            });
        }
    }

    toggleStatus(user: AdminUser) {
        this.adminService.toggleUserStatus(user.id).subscribe({
            next: (updated) => {
                const index = this.users.findIndex(u => u.id === user.id);
                if (index !== -1) {
                    this.users[index] = updated;
                }
                this.showSuccess(updated.isActive ? 'Usuário ativado!' : 'Usuário desativado!');
            },
            error: (err) => {
                this.error = err.message;
            }
        });
    }

    showSuccess(message: string) {
        this.successMessage = message;
        setTimeout(() => this.successMessage = '', 3000);
    }

    formatDate(date: string): string {
        return new Date(date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    }
}
