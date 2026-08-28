import { Component, inject, signal, ViewChild } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SidebarComponent } from '../sidebar/sidebar';
import { filter } from 'rxjs';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, MatSidenavModule, MatButtonModule, MatIconModule, SidebarComponent],
  templateUrl: './main-layout.html'
})
export class MainLayoutComponent {
  @ViewChild('sidenav') sidenav!: MatSidenav;

  isMobile = signal(false);

  private bp = inject(BreakpointObserver);
  private router = inject(Router);

  constructor() {
    this.bp.observe([Breakpoints.XSmall, Breakpoints.Small]).subscribe(result => {
      this.isMobile.set(result.matches);
    });
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      if (this.isMobile() && this.sidenav?.opened) {
        this.sidenav.close();
      }
    });
  }
}
