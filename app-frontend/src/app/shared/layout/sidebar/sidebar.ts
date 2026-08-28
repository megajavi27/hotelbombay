import { Component, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '@services/auth.service';
import { getNavItems, NavItem } from '@app/core/config/menu-perfil.config';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatListModule, MatIconModule, MatDividerModule, MatButtonModule],
  templateUrl: './sidebar.html'
})
export class SidebarComponent {
  authService = inject(AuthService);

  navItems = computed<NavItem[]>(() => {
    const u = this.authService.usuario();
    const tipo = u?.tipo ?? 'empleado';
    const modulos = this.authService.getModulosPermitidos();
    return getNavItems(tipo).filter((item: NavItem) => modulos.includes(item.modulo));
  });

  grupos = computed<string[]>(() => {
    const vistos = new Set<string>();
    const result: string[] = [];
    for (const item of this.navItems()) {
      if (!vistos.has(item.grupo)) { vistos.add(item.grupo); result.push(item.grupo); }
    }
    return result;
  });

  itemsPorGrupo(grupo: string): NavItem[] {
    return this.navItems().filter((i: NavItem) => i.grupo === grupo);
  }

  logout() { this.authService.logout(); }
}
