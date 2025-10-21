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
    localStorage.setItem('tecnicoId', user.id_tecnico); // Guardamos solo el ID del técnico, si es necesario
    localStorage.setItem('tecnico' , JSON.stringify(user));
  }

  // Obtener el token de acceso
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // Obtener el ID del técnico
  getTecnicoId(): string | null {
    return localStorage.getItem('tecnicoId');
  }

  // Cerrar sesión
  logout(): void {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('token');
    localStorage.removeItem('tecnicoId');
  }
}
