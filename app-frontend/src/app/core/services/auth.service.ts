import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../environments/environment';
import { getModulosPermitidos } from '../config/menu-perfil.config';

export interface UsuarioAutenticado {
  id_usuario: number;
  email: string;
  nombreCompleto: string;
  tipo: 'empleado' | 'cliente';
  perfil?: string;
  id_empleado?: number;
  id_cliente?: number;
}

interface AuthResponse {
  accessToken: string;
  usuario: UsuarioAutenticado;
}

const TOKEN_KEY = 'hb_token';
const USER_KEY  = 'hb_usuario';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http    = inject(HttpClient);
  private router  = inject(Router);
  private apiUrl  = environment.apiUrl;

  usuario = signal<UsuarioAutenticado | null>(this.leerUsuarioGuardado());

  registroCliente(dto: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/registro`, dto)
      .pipe(tap(r => this.guardarSesion(r)));
  }

  olvidePassword(email: string): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(`${this.apiUrl}/auth/olvide-password`, { email });
  }

  restablecerPassword(token: string, password: string): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(`${this.apiUrl}/auth/restablecer-password`, { token, password });
  }

  loginEmpleado(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login/empleado`, { email, password })
      .pipe(tap(r => this.guardarSesion(r)));
  }

  loginCliente(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login/cliente`, { email, password })
      .pipe(tap(r => this.guardarSesion(r)));
  }

  me(): Observable<UsuarioAutenticado> {
    return this.http.get<UsuarioAutenticado>(`${this.apiUrl}/auth/me`).pipe(
      tap(u => {
        localStorage.setItem(USER_KEY, JSON.stringify(u));
        this.usuario.set(u);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.usuario.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null      { return localStorage.getItem(TOKEN_KEY); }
  isLoggedIn(): boolean          { return !!this.getToken(); }
  getUsuario(): UsuarioAutenticado | null { return this.usuario(); }

  /** Módulos que puede ver el usuario actual */
  getModulosPermitidos(): string[] {
    const u = this.usuario();
    if (!u) return [];
    return getModulosPermitidos(u.tipo, u.perfil);
  }

  puedeAcceder(modulo: string): boolean {
    return this.getModulosPermitidos().includes(modulo);
  }

  private guardarSesion(r: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, r.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(r.usuario));
    this.usuario.set(r.usuario);
  }

  private leerUsuarioGuardado(): UsuarioAutenticado | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }
}
