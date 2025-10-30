import { Component } from '@angular/core';
import { DatePipe, registerLocaleData } from '@angular/common';
import localeEsCl from '@angular/common/locales/es-CL';
import { ApiService } from 'src/app/services/api';
import { Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';
import { finalize } from 'rxjs/operators';
import { AuthService } from 'src/app/services/auth-service';
import { Capacitor } from '@capacitor/core';

registerLocaleData(localeEsCl, 'es-CL');

interface Visita {
  
  solicitante: string;
  realizado: string;
  inicio: string;
  fin: string;
  direccion_visita?: string;
  cliente: {
    nombre: string;
    empresa: {
      nombre: string;
    };
  };
  nombreCliente?: string;
  sucursalNombre?: string;
  sucursalId?: number; // ✅ Agregar esto
  tieneSucursal?: boolean; // ✅ Agregar flag para fácil verificación
}

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: false,
})
export class PerfilPage implements ViewWillEnter {
 page = 1;
  limit = 10;
  hasMore = true;
  loading = false;
  visitas: Visita[] = [];
  tecnicoId: number = 0;
  tecnico: any;
  clientes: any[] = [];

  constructor(
    private api: ApiService,
    private datePipe: DatePipe,
    private router: Router,
    private auth: AuthService
  ) { }

  async ionViewWillEnter() {
    const id = localStorage.getItem('tecnicoId');
    const tecnicoData = localStorage.getItem('tecnico');

    if (id) {
      this.tecnicoId = parseInt(id, 10);
       this.visitas = [];
      this.page = 1;
      this.hasMore = true;

      await this.cargarHistorial();
    }

    if (tecnicoData) {
      this.tecnico = JSON.parse(tecnicoData);
    } else {
      this.tecnico = null;
    }
  }

  // ✅ Cargar historial con direcciones exactas o aproximadas
    // ✅ Cargar historial paginado (acumula resultados)
  private async cargarHistorial(event?: CustomEvent) {
    if (this.loading || !this.hasMore) {
      event?.target && (event.target as HTMLIonInfiniteScrollElement).complete();
      return;
    }

    this.loading = true;

    this.api.getHistorialPorTecnico(this.tecnicoId, this.page, this.limit).subscribe({
      next: async (res) => {
        const historial = res.historial || res.visitas || [];

        // 🔁 transforma SOLO la página actual y acumula
        const paginaTransformada: Visita[] = await Promise.all(
          historial.map(async (visita: any) => {
            const direccionLegible = await this.obtenerDireccionDesdeCoordenadasHistorial(visita.direccion_visita);

            const sucursalNombre = visita.sucursalNombre || visita.solicitanteRef?.sucursal?.nombre;
            const sucursalId = visita.sucursalId || visita.solicitanteRef?.sucursal?.id_sucursal;
            const tieneSucursal = !!sucursalNombre && sucursalNombre !== '—' && sucursalNombre !== null;

            return {
              ...visita,
              nombreCliente: visita.nombreCliente || 'Empresa desconocida',
              solicitante: visita.nombreSolicitante || 'Cliente desconocido',
              direccion_visita: direccionLegible,
              sucursalNombre: tieneSucursal ? sucursalNombre : null,
              sucursalId: tieneSucursal ? sucursalId : null,
              tieneSucursal,
            } as Visita;
          })
        );

        // ✅ acumula
        this.visitas = [...this.visitas, ...paginaTransformada];

        // ✅ avanza page/hasMore según backend
        const total = res?.total;
        const hasMoreFromApi = typeof res?.hasMore === 'boolean' ? res.hasMore : null;

        if (hasMoreFromApi !== null) {
          this.hasMore = hasMoreFromApi;
        } else if (typeof total === 'number') {
          const cargados = this.page * this.limit;
          this.hasMore = cargados < total;
        } else {
          // fallback: si la página vino “llena”, asumimos que hay más
          this.hasMore = historial.length === this.limit;
        }

        if (this.hasMore) this.page += 1;
      },
      error: (err) => {
        console.error('❌ Error al cargar historial:', err);
      },
      complete: () => {
        this.loading = false;
        if (event?.target) (event.target as HTMLIonInfiniteScrollElement).complete();
      },
    });
  }
cargarMas(event: CustomEvent) {
    this.cargarHistorial(event);
  }
  // ✅ Obtener dirección desde coordenadas (usa Nominatim o fallback)
  private async obtenerDireccionDesdeCoordenadasHistorial(coordenadas: string): Promise<string> {
    try {
      if (!coordenadas || !this.esCoordenada(coordenadas)) {
        return 'Ubicación no disponible';
      }

      const [lat, lon] = coordenadas.split(',').map(coord => parseFloat(coord.trim()));

      // 🔹 Si estamos en Android/iOS, intentar dirección exacta
      if (Capacitor.isNativePlatform()) {
        const direccion = await this.obtenerDireccionExactaSantiago(lat, lon);
        if (direccion) return direccion;
      } else {
        // 🔹 Si estamos en web, evitar CORS (fallback)
        console.warn('🌐 Navegador detectado: usando comuna aproximada.');
      }

      // Fallback: comuna aproximada
      const comuna = this.detectarComunaSantiago(lat, lon);
      return `${comuna}, Santiago, Región Metropolitana`;

    } catch (error) {
      console.warn('⚠️ No se pudo obtener dirección exacta:', error);
      return 'Ubicación registrada en Santiago';
    }
  }

  // ✅ Reverse geocoding real (solo en Android/iOS)
  private async obtenerDireccionExactaSantiago(lat: number, lon: number): Promise<string | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=es`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'RidsMovilApp/1.0 (app@rids.cl)',
          },
        }
      );

      if (!response.ok) {
        console.warn('❌ Respuesta HTTP inválida:', response.status);
        return null;
      }

      const data = await response.json();
      const address = data.address;
      if (!address) return null;

      let partes: string[] = [];

      if (address.road) {
        let calle = address.road;
        if (address.house_number) calle += ` #${address.house_number}`;
        partes.push(calle);
      }

      if (address.suburb) partes.push(address.suburb);
      else if (address.city_district) partes.push(address.city_district);

      partes.push('Santiago', 'Región Metropolitana');

      const direccionFinal = partes.join(', ');

      return direccionFinal;
    } catch (error) {
      console.warn('⚠️ No se pudo obtener dirección exacta:', error);
      return null;
    }
  }

  // ✅ Detectar comuna aproximada (fallback)
  private detectarComunaSantiago(lat: number, lon: number): string {
    if (lat > -33.45 && lat < -33.42 && lon > -70.68 && lon < -70.64) return 'Santiago Centro';
    if (lat > -33.44 && lat < -33.42 && lon > -70.62 && lon < -70.58) return lon > -70.60 ? 'Providencia' : 'Ñuñoa';
    if (lat > -33.42 && lat < -33.38 && lon > -70.58 && lon < -70.55) {
      if (lat < -33.40) return 'Las Condes';
      if (lon > -70.57) return 'Vitacura';
      return 'Lo Barnechea';
    }
    if (lat > -33.52 && lat < -33.45 && lon > -70.75 && lon < -70.70) return 'Maipú';
    if (lat > -33.62 && lat < -33.52 && lon > -70.60 && lon < -70.55) return lat < -33.57 ? 'Puente Alto' : 'La Florida';
    if (lat > -33.65 && lat < -33.55 && lon > -70.72 && lon < -70.65) return 'San Bernardo';
    if (lat > -33.38 && lat < -33.33 && lon > -70.75 && lon < -70.68) return 'Quilicura';
    if (lat > -33.48 && lat < -33.45 && lon > -70.70 && lon < -70.65) return 'Estación Central';
    if (lat > -33.42 && lat < -33.40 && lon > -70.66 && lon < -70.62) return 'Recoleta';
    if (lat < -33.5) return 'Zona Sur de Santiago';
    if (lon < -70.7) return 'Zona Poniente de Santiago';
    if (lon > -70.58) return 'Zona Oriente de Santiago';
    return 'Santiago';
  }

  // ✅ Verificar si la cadena son coordenadas válidas
  private esCoordenada(valor: string): boolean {
    if (!valor.includes(',')) return false;
    const [lat, lon] = valor.split(',').map((v) => parseFloat(v.trim()));
    return !isNaN(lat) && !isNaN(lon);
  }

  formatoFecha(fecha: string | null): string {
    if (!fecha) return '-';
    const date = new Date(fecha);
    return this.datePipe.transform(date, 'dd/MM/yyyy') || '-';
  }

  formatoHora(fecha: string | null): string {
    if (!fecha) return '-';
    const date = new Date(fecha);
    return this.datePipe.transform(date, 'HH:mm') || '-';
  }

  cerrarSesion() {
    this.api.logout()
      .pipe(finalize(() => {
        this.auth.logout();
        this.router.navigate(['/home']);
      }))
      .subscribe({
        next: (res) => console.log('Logout OK', res),
        error: (err) => console.warn('Logout falló (se limpia igual en cliente):', err),
      });
  }
}