import { Component, ElementRef, ViewChild, inject, signal, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { RecomendacionIaService } from '@services/recomendacion-ia.service';
import { ChatService, ChatMessage } from '@services/chat.service';
import { NotificationService } from '@services/notification.service';
import { AuthService } from '@services/auth.service';
import { ConfirmDialogService } from '@shared/components/confirm-dialog/confirm-dialog.service';
import { PageLayoutComponent } from '@shared/components/page-layout/page-layout';
import { PaginationState } from '@utils/pagination.util';

export const CATEGORIA_MAP: Record<string, { label: string; icon: string; badge: string }> = {
  TURISTICO:       { label: 'Turístico',       icon: 'tour',             badge: 'hb-badge hb-badge-info'      },
  RESTAURANTE:     { label: 'Restaurante',      icon: 'restaurant',       badge: 'hb-badge hb-badge-warning'   },
  ENTRETENIMIENTO: { label: 'Entretenimiento',  icon: 'theater_comedy',   badge: 'hb-badge hb-badge-secondary' },
  TRANSPORTE:      { label: 'Transporte',       icon: 'directions_bus',   badge: 'hb-badge hb-badge-neutral'   },
  COMPRAS:         { label: 'Compras',          icon: 'shopping_bag',     badge: 'hb-badge hb-badge-success'   },
  OTRO:            { label: 'Otro',             icon: 'category',         badge: 'hb-badge'                    },
};

@Component({
  selector: 'app-recomendaciones-list',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatPaginatorModule,
    PageLayoutComponent,
  ],
  templateUrl: './list.html',
})
export class RecomendacionesListComponent {
  private svc          = inject(RecomendacionIaService);
  private chatSvc      = inject(ChatService);
  private auth         = inject(AuthService);
  private notification = inject(NotificationService);
  private confirm      = inject(ConfirmDialogService);

  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;

  readonly catMap     = CATEGORIA_MAP;
  readonly categorias = Object.entries(CATEGORIA_MAP).map(([value, v]) => ({ value, ...v }));

  esEmpleado = computed(() => this.auth.usuario()?.tipo === 'empleado');

  // ── Filtro (empleado) ──────────────────────────────────────────────────────
  categoriaActiva = signal<string | null>(null);

  // ── Employee: paginated list ───────────────────────────────────────────────
  items      = signal<any[]>([]);
  isLoading  = signal(true);
  pagination = new PaginationState();

  itemsFiltrados = computed(() => {
    const cat = this.categoriaActiva();
    return cat ? this.items().filter(r => r.categoria === cat) : this.items();
  });

  // ── Client: chat ───────────────────────────────────────────────────────────
  messages    = signal<ChatMessage[]>([]);
  inputText   = '';
  isSending   = signal(false);

  readonly BIENVENIDA: ChatMessage = {
    role: 'assistant',
    content: '¡Hola! 👋 Soy el asistente del Hotel Bombay. Puedo recomendarte restaurantes, lugares turísticos, entretenimiento, transporte y más para que disfrutes al máximo tu estadía. ¿Qué tipo de plan tienes en mente?',
  };

  constructor() {
    if (this.esEmpleado()) {
      this.load();
    } else {
      // Iniciar chat con mensaje de bienvenida
      this.messages.set([this.BIENVENIDA]);
    }

    // Auto-scroll al último mensaje
    effect(() => {
      this.messages();
      this.isSending();
      setTimeout(() => this.scrollToBottom(), 50);
    });
  }

  // ── Empleado ───────────────────────────────────────────────────────────────

  load() {
    this.isLoading.set(true);
    this.svc.getAll(this.pagination.page, this.pagination.limit).subscribe({
      next: (r) => { this.items.set(r.data); this.pagination.total = r.total; this.isLoading.set(false); },
      error: (err) => { this.notification.error(err?.error?.message ?? 'Error cargando recomendaciones.'); this.isLoading.set(false); }
    });
  }

  onPageChange(e: PageEvent) {
    this.pagination.onPageChange(e);
    this.load();
  }

  setCategoria(cat: string | null) {
    this.categoriaActiva.set(this.categoriaActiva() === cat ? null : cat);
  }

  catInfo(cat: string) {
    return this.catMap[cat] ?? this.catMap['OTRO'];
  }

  estrellas(cal: number): string {
    const n = Math.round(cal ?? 0);
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  }

  confirmDelete(id: number) {
    this.confirm.confirmDelete('esta recomendación').subscribe(ok => {
      if (!ok) return;
      this.svc.delete(id).subscribe({
        next: () => { this.notification.success('Recomendación eliminada.'); this.load(); },
        error: (err) => this.notification.error(err?.error?.message ?? 'No se pudo eliminar.')
      });
    });
  }

  // ── Cliente: chat ──────────────────────────────────────────────────────────

  sendMessage() {
    const text = this.inputText.trim();
    if (!text || this.isSending()) return;

    // Agregar mensaje del usuario
    const userMsg: ChatMessage = { role: 'user', content: text };
    this.messages.update(msgs => [...msgs, userMsg]);
    this.inputText = '';
    this.isSending.set(true);

    // Enviar historial completo (sin el mensaje de bienvenida, que es solo UI)
    const historial = this.messages().filter(m => !(m === this.BIENVENIDA));

    this.chatSvc.send(historial).subscribe({
      next: (res) => {
        this.messages.update(msgs => [...msgs, { role: 'assistant', content: res.reply }]);
        this.isSending.set(false);
      },
      error: () => {
        this.messages.update(msgs => [...msgs, {
          role: 'assistant',
          content: 'Lo siento, hubo un problema al conectar con el asistente. Por favor intenta de nuevo.'
        }]);
        this.isSending.set(false);
      }
    });
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  clearChat() {
    this.messages.set([this.BIENVENIDA]);
  }

  private scrollToBottom() {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }
}
