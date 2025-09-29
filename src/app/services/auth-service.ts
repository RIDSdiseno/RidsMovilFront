import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor() { }

  // Verifica si el técnico está logueado
  isLoggedIn(): boolean {
    return localStorage.getItem('isLoggedIn') === 'true';
  }

  // Almacenar el token y los datos del técnico al loguearse
  login(token: string, user: any): void {
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('token', token); // Guardamos el token
    localStorage.setItem('tecnico', JSON.stringify(user)); // Guardamos la información del técnico
    localStorage.setItem('tecnicoId', user.id); // También guardamos el ID del técnico, si es necesario
  }

  // Obtener el token de acceso
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // Obtener los datos del técnico
  getTecnico(): any {
    return JSON.parse(localStorage.getItem('tecnico') || '{}');
  }

  // Cerrar sesión
  logout(): void {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('token');
    localStorage.removeItem('tecnico');
    localStorage.removeItem('tecnicoId');
  }
}
