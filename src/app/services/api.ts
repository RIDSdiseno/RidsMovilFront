import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';  // para usar apiUrl desde environment.ts

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor(private http: HttpClient) { }

  // Método para obtener clientes
  getClientes(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/auth/clientes`); // Usa la apiUrl definida en environment.ts
  }
  loginTecnicos(credentials:{email:string,password:string}):Observable<any>{
    return this.http.post(`${environment.apiUrl}/auth/login`,credentials)
  }
  crearVisita(data:any):Observable<any>{
    return this.http.post(`${environment.apiUrl}/auth/crear_visita`,data);
  }
  completarVisita(visitaId: number,data:any):Observable<any>{
    return this.http.put(`${environment.apiUrl}/auth/finalizar_visita/${visitaId}`,data)
  }
}