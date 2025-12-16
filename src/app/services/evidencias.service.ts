import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from './auth-service';

export type EvidenciaTipo = 'foto' | 'firma';

export type UploadSignatureResponse = {
  apiKey: string;
  cloudName: string;
  folder: string;
  publicId: string;
  signature: string;
  timestamp: number;
  resourceType?: string;
  allowedFormats?: string[];
  maxBytes?: number;
  uploadUrl?: string;
};

@Injectable({
  providedIn: 'root',
})
export class EvidenciasService {
  constructor(private readonly http: HttpClient, private readonly authService: AuthService) {}

  crearEntrega(payload: { empresaNombre: string; receptorNombre: string; fecha?: string | Date }): Observable<any> {
    const body = {
      empresaNombre: payload.empresaNombre,
      receptorNombre: payload.receptorNombre,
      fecha: payload.fecha ? new Date(payload.fecha).toISOString() : undefined,
    };

    return this.http.post(`${environment.apiUrl}/entregas`, body, { headers: this.buildAuthHeaders() });
  }

  solicitarFirmaSubida(
    entregaId: number,
    data: { tipo: EvidenciaTipo; formato?: string | null; bytes?: number | null }
  ): Observable<UploadSignatureResponse> {
    const body = {
      tipo: data.tipo,
      formato: data.formato || undefined,
      bytes: data.bytes ?? undefined,
    };

    return this.http.post<UploadSignatureResponse>(
      `${environment.apiUrl}/entregas/${entregaId}/evidencias/firma`,
      body,
      { headers: this.buildAuthHeaders() }
    );
  }

  confirmarEvidencia(
    entregaId: number,
    data: { tipo: EvidenciaTipo; formato: string; bytes: number; url: string; publicId: string }
  ): Observable<any> {
    return this.http.post(
      `${environment.apiUrl}/entregas/${entregaId}/evidencias/confirmar`,
      data,
      { headers: this.buildAuthHeaders() }
    );
  }

  async uploadToCloudinary(
    signature: UploadSignatureResponse,
    file: Blob,
    fileName: string
  ): Promise<any> {
    const endpoint =
      signature.uploadUrl ||
      `https://api.cloudinary.com/v1_1/${signature.cloudName}/${signature.resourceType || 'auto'}/upload`;

    const formData = new FormData();
    formData.append('file', file, fileName);
    formData.append('api_key', signature.apiKey);
    formData.append('timestamp', String(signature.timestamp));
    formData.append('signature', signature.signature);
    if (signature.folder) formData.append('folder', signature.folder);
    if (signature.publicId) formData.append('public_id', signature.publicId);

    const resp = await fetch(endpoint, { method: 'POST', body: formData });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(text || 'No se pudo subir la evidencia');
    }
    return resp.json();
  }

  private buildAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }
}
