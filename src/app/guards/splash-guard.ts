// src/app/guards/login.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth-service';

@Injectable({ providedIn: 'root' })
export class LoginGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean {
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/inicio-footer'], { replaceUrl: true });
      return false; // no deja renderizar /home si ya hay sesión
    }
    return true; // permite entrar a /home (login) si no hay sesión
    }
}
