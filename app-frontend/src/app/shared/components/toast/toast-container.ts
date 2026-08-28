import { Component, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { NotificationService, Toast } from '@services/notification.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [NgClass],
  template: `
    <div class="hb-toast-viewport" aria-live="polite" aria-atomic="false">
      @for (toast of notification.toasts(); track toast.id) {
        <div
          class="hb-toast"
          [ngClass]="[
            'hb-toast--' + toast.type,
            toast.leaving ? 'hb-toast--out' : 'hb-toast--in'
          ]"
          role="alert"
        >
          <!-- Icono -->
          <span class="hb-toast__icon material-symbols-outlined">
            {{ iconMap[toast.type] }}
          </span>

          <!-- Mensaje -->
          <span class="hb-toast__msg">{{ toast.message }}</span>

          <!-- Cerrar -->
          <button
            class="hb-toast__close"
            (click)="notification.dismiss(toast.id)"
            aria-label="Cerrar notificación"
          >
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .hb-toast-viewport {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 360px;
      max-width: calc(100vw - 40px);
      pointer-events: none;
    }

    .hb-toast {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px 16px;
      border-radius: 10px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.18);
      pointer-events: all;
      font-family: 'Montserrat', sans-serif;
      font-size: 0.875rem;
      font-weight: 500;
      line-height: 1.4;
      border-left: 4px solid;
    }

    /* Success */
    .hb-toast--success {
      background: #f0fdf4;
      border-color: #22c55e;
      color: #14532d;
    }
    .hb-toast--success .hb-toast__icon { color: #16a34a; }

    /* Error */
    .hb-toast--error {
      background: #fff1f2;
      border-color: #f43f5e;
      color: #881337;
    }
    .hb-toast--error .hb-toast__icon { color: #e11d48; }

    /* Warn */
    .hb-toast--warn {
      background: #fffbeb;
      border-color: #f59e0b;
      color: #78350f;
    }
    .hb-toast--warn .hb-toast__icon { color: #d97706; }

    /* Icon */
    .hb-toast__icon {
      font-size: 1.25rem;
      flex-shrink: 0;
      margin-top: 1px;
      font-variation-settings: 'FILL' 1;
    }

    /* Message */
    .hb-toast__msg {
      flex: 1;
    }

    /* Close button */
    .hb-toast__close {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      color: inherit;
      opacity: 0.5;
      display: flex;
      align-items: center;
      flex-shrink: 0;
      transition: opacity 0.15s;
    }
    .hb-toast__close:hover { opacity: 1; }
    .hb-toast__close .material-symbols-outlined { font-size: 1.1rem; }

    /* Animations */
    @keyframes toastIn {
      from { opacity: 0; transform: translateX(110%); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes toastOut {
      from { opacity: 1; transform: translateX(0); max-height: 120px; margin-bottom: 0; }
      to   { opacity: 0; transform: translateX(110%); max-height: 0;   margin-bottom: -10px; }
    }

    .hb-toast--in  { animation: toastIn  0.32s cubic-bezier(0.22, 1, 0.36, 1) both; }
    .hb-toast--out { animation: toastOut 0.38s cubic-bezier(0.55, 0, 1, 0.45) both; }
  `]
})
export class ToastContainerComponent {
  notification = inject(NotificationService);

  readonly iconMap: Record<string, string> = {
    success: 'check_circle',
    error:   'error',
    warn:    'warning',
  };
}
