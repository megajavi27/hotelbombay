import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warn';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  leaving: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly toasts = signal<Toast[]>([]);

  private add(message: string, type: ToastType, duration: number): void {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    this.toasts.update(list => [...list, { id, message, type, leaving: false }]);
    setTimeout(() => this.startLeave(id), duration);
  }

  private startLeave(id: number): void {
    this.toasts.update(list =>
      list.map(t => t.id === id ? { ...t, leaving: true } : t)
    );
    setTimeout(() => this.remove(id), 380);
  }

  remove(id: number): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  dismiss(id: number): void {
    this.startLeave(id);
  }

  success(message: string): void { this.add(message, 'success', 3500); }
  error(message: string): void   { this.add(message, 'error',   5000); }
  warn(message: string): void    { this.add(message, 'warn',    4000); }
}
