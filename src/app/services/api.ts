import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth-service';
import { environment } from 'src/environments/environment';  // para usar apiUrl desde environment.ts

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor(private http: HttpClient, private authService: AuthService) { }

  // Método para obtener clientes
  getClientes(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/auth/clientes`); // Usa la apiUrl definida en environment.ts
  }

  loginTecnicos(credentials: { email: string, password: string }): Observable<any> {
    return this.http.post(`${environment.apiUrl}/auth/login`, credentials)
  }

  crearVisita(data: any): Observable<any> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.post(`${environment.apiUrl}/auth/crear_visita`, data, { headers });
  }

  completarVisita(visitaId: number, data: any): Observable<any> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.put(`${environment.apiUrl}/auth/finalizar_visita/${visitaId}`, data, { headers })
  }

  getHistorialPorTecnico(tecnicoId: number) {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
    return this.http.get<any>(`${environment.apiUrl}/auth/historial/${tecnicoId}`, { headers });
  }

  getSolicitantes(empresaId: number): Observable<any> {
    return this.http.get(`${environment.apiUrl}/auth/solicitantes?empresaId=${empresaId}`);
  }

  getEquipos(): Observable<any> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.get(`${environment.apiUrl}/auth/equipos`, { headers });
  }

  actualizarEquipo(
  id: number,
  data: Partial<{ disco: string; procesador: string; ram: string }>
) {
  return this.http.put(`${environment.apiUrl}/auth/equipos/${id}`, data);
}

}