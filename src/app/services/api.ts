import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth-service';
import { environment } from 'src/environments/environment.prod';  // para usar apiUrl desde environment.ts

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

  logout(): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(
      `${environment.apiUrl}/auth/logout`,
      {},
      { withCredentials: false } // <- MANDATORIO: así se envía la cookie 'rt'
    );
  }

  getHistorialPorTecnico(tecnicoId: number, page = 1, limit = 5) {
  const token = this.authService.getToken();
  const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

  return this.http.get<any>(`${environment.apiUrl}/auth/historial/${tecnicoId}`, {
    headers,
    params: { page, limit }
  });
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
    data: Partial<{ disco: string; procesador: string; ram: string; tipoDd: string }>
  ) {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.put(`${environment.apiUrl}/auth/equipos/${id}`, data, { headers });
  }

  crearEquipo(data: any): Observable<any> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.post(`${environment.apiUrl}/auth/crearequipo`, data, { headers });
  }

  // Método para crear solicitante
  // Método para crear usuario (solicitante en backend)
  crearUsuario(usuarioData: {
    nombre: string;
    empresaId: number;
    email?: string;
    telefono?: string;
    clienteId?: number | null;
  }): Observable<any> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    });

    return this.http.post(`${environment.apiUrl}/auth/createSolicitante`, usuarioData, { headers });
  }

  // 🔹 Obtener sucursales por empresa
  getSucursalesPorEmpresa(empresaId: number): Observable<any> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.get(`${environment.apiUrl}/auth/empresas/${empresaId}/sucursales`, { headers });
  }

  getSolicitantesPorSucursal(sucursalId: number): Observable<any> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    return this.http.get(`${environment.apiUrl}/auth/sucursales/${sucursalId}/solicitantes`, { headers });
  }
  /* ========= SYNC GOOGLE ========= */

  syncGoogleAll(payload: { domain: string; empresaId: number }) {
    return this.http.post(`${environment.apiUrl1}/sync/google/users`, payload);
  }

  syncGoogleUser(payload: { domain: string; empresaId: number; email: string }) {
    return this.http.put(`${environment.apiUrl1}/sync/google/users`, payload);
  }

  /* ========= SYNC MICROSOFT ========= */

  syncMicrosoftAll(payload: {
    empresaId: number;
    domain?: string;
    concurrency?: number;
    chunkSize?: number;
  }) {
    return this.http.post(`${environment.apiUrl1}/sync/microsoft/users`, payload);
  }

  syncMicrosoftUser(payload: {
    empresaId: number;
    domain?: string;
    email: string;
    concurrency?: number;
  }) {
    return this.http.put(`${environment.apiUrl1}/sync/microsoft/users`, payload);
  }

}
