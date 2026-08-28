import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-page-layout',
  standalone: true,
  imports: [NgClass, RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './page-layout.html'
})
export class PageLayoutComponent {
  /** Título de la página (omitir para usar header personalizado externo) */
  @Input() title = '';
  @Input() subtitle = '';
  /** Botón de acción principal */
  @Input() buttonLabel = '';
  @Input() buttonRoute = '';
  @Input() buttonIcon = 'add';
  /** Sin card wrapper — para layouts de grilla (tipos, recomendaciones) */
  @Input() noCard = false;
}
