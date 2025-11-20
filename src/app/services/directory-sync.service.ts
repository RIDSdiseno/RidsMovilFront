// src/app/services/directory-sync.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';

export interface SyncGoogleResponse {
  ok: boolean;
  domain: string;
  empresaId: number;
  total: number;
  created: number;
  updated: number;
  skipped: number;
}

export interface SyncMsResponse {
  ok: boolean;
  empresaId: number;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  // puedes agregar más campos si quieres (timings, etc.)
}

@Injectable({ providedIn: 'root' })
export class DirectorySyncService {
  // OJO: apiUrl1 ya tiene el /api al final
  private baseUrl = environment.apiUrl1;

  constructor(private http: HttpClient) {}

  /* ======= GOOGLE WORKSPACE ======= */

  // POST /sync/google/users -> re-sincroniza todo el dominio
  syncGoogleAll(domain: string, empresaId: number): Observable<SyncGoogleResponse> {
    return this.http.post<SyncGoogleResponse>(
      `${this.baseUrl}/sync/google/users`,
      { domain, empresaId }
    );
  }

  // PUT /sync/google/users -> re-sincroniza un solo usuario por email
  syncGoogleUser(domain: string, empresaId: number, email: string): Observable<SyncGoogleResponse> {
    return this.http.put<SyncGoogleResponse>(
      `${this.baseUrl}/sync/google/users`,
      { domain, empresaId, email }
    );
  }

  /* ======= MICROSOFT 365 (Graph) ======= */

  // POST /sync/microsoft/users -> todo el tenant/dominio
  syncMicrosoftAll(
    empresaId: number,
    options?: { domain?: string; concurrency?: number; chunkSize?: number }
  ): Observable<SyncMsResponse> {
    const body: any = { empresaId };
    if (options?.domain) body.domain = options.domain;
    if (typeof options?.concurrency === 'number') body.concurrency = options.concurrency;
    if (typeof options?.chunkSize === 'number') body.chunkSize = options.chunkSize;

    return this.http.post<SyncMsResponse>(
      `${this.baseUrl}/sync/microsoft/users`,
      body
    );
  }

  // PUT /sync/microsoft/users -> un solo usuario
  syncMicrosoftUser(
    empresaId: number,
    email: string,
    options?: { domain?: string; concurrency?: number }
  ): Observable<SyncMsResponse> {
    const body: any = { empresaId, email };
    if (options?.domain) body.domain = options.domain;
    if (typeof options?.concurrency === 'number') body.concurrency = options.concurrency;

    return this.http.put<SyncMsResponse>(
      `${this.baseUrl}/sync/microsoft/users`,
      body
    );
  }
}
