import { DatePipe, registerLocaleData } from '@angular/common';
import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, ToastController, Platform } from '@ionic/angular';
import { ApiService } from 'src/app/services/api';
import { VisitaStateService } from 'src/app/services/visita-state';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import localeEsCl from '@angular/common/locales/es-CL';
import { NativeSettings, AndroidSettings, IOSSettings } from 'capacitor-native-settings';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';


registerLocaleData(localeEsCl, 'es-CL');

@Component({
  selector: 'app-formulario-visitas',
  templateUrl: './formulario-visitas.page.html',
  styleUrls: ['./formulario-visitas.page.scss'],
  standalone: false,
})
export class FormularioVisitasPage implements OnInit, OnDestroy {

  visitaId: number | null = null;
  visitaForm: FormGroup;
  visitas: any[] = [];
  filtradosSolicitantes: any[] = [];
  todosSolicitantes: any[] = [];

  mostrarListaSolicitantes = false;
  busquedaSolicitante = '';
  nombreSolicitanteSeleccionado = '';

  inicio: Date | null = null;
  fin: Date | null = null;
  estado: string = 'Sin iniciar';
  estadoTexto: string = 'Listo para iniciar una visita.';
  visitaEnCurso = false;
  username: string = '';
  tecnicoId: string = '';
  filtradosSolicitantesUI: any[] = [];
  clientes: any[] = [];
  empresaId: number = 0;

  // Variables para geolocalización
  isLoadingLocation = false;
  ubicacionObtenida = false;

  latitud: number | null = null;
  longitud: number | null = null;
  direccionExacta: string = '';

  private formSubscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private datePipe: DatePipe,
    private alertController: AlertController,
    private router: Router,
    private api: ApiService,
    private toastController: ToastController,
    private visitaState: VisitaStateService,
    private platform: Platform,
  ) {
    this.visitaForm = this.fb.group({
      cliente: ['', Validators.required],
      solicitante: [[], Validators.required],
      busquedaSolicitante: [''],
      actividades: this.fb.group({
        impresoras: [false],
        telefonos: [false],
        pie: [false],
        otros: [false],
        ccleaner: [true],
        actualizaciones: [true],
        estadoDisco: [true],
        antivirus: [true],
        licenciaWindows: [true],
        licenciaOffice: [true],
        rendimientoEquipo: [true],
        mantenimientoReloj: [true]
      }),
      otrosDetalle: [''],
      direccion_visita: [{ value: '', disabled: true }]
    });

    this.visitaForm.get('actividades.otros')?.valueChanges.subscribe((val) => {
      if (!val) {
        this.visitaForm.get('otrosDetalle')?.setValue('');
        this.visitaForm.get('otrosDetalle')?.clearValidators();
        this.visitaForm.get('otrosDetalle')?.updateValueAndValidity();
      } else {
        this.visitaForm.get('otrosDetalle')?.setValidators([Validators.required]);
        this.visitaForm.get('otrosDetalle')?.updateValueAndValidity();
      }
    });

    this.setupAutoSave();
  }

  private setupAutoSave(): void {
    const actividadesSub = this.visitaForm.get('actividades')?.valueChanges
      .pipe(debounceTime(1000))
      .subscribe(actividades => {
        if (this.visitaEnCurso) {
          this.visitaState.agregarActividades(actividades);
        }
      });

    const otrosDetalleSub = this.visitaForm.get('otrosDetalle')?.valueChanges
      .pipe(debounceTime(1000))
      .subscribe(otrosDetalle => {
        if (this.visitaEnCurso) {
          this.visitaState.guardarProgresoFormulario({ otrosDetalle });
        }
      });

    const clienteSub = this.visitaForm.get('cliente')?.valueChanges
      .subscribe(clienteId => {
        if (this.visitaEnCurso && clienteId) {
          this.visitaState.updateState({ clienteId });
        }
      });

    [actividadesSub, otrosDetalleSub, clienteSub].forEach(sub => {
      if (sub) this.formSubscriptions.push(sub);
    });
  }

  ngOnDestroy() {
    this.formSubscriptions.forEach(sub => sub.unsubscribe());
  }

  ngOnInit() {
    this.debugGeoOrigen();



    this.api.getClientes().subscribe(
      (data) => {
        console.log('Clientes cargados:', data);
        this.clientes = data;
      },
      (error) => {
        console.error('Error al cargar clientes', error);
      }
    );

    this.cargarVisitaEnCurso();

    if (this.visitaId) {
      this.api.crearVisita(this.visitaId).subscribe((visitaData) => {
        const actividades = visitaData.actividades || {};
        this.visitaForm.patchValue({
          actividades: {
            impresoras: actividades.impresoras ?? true,
            telefonos: actividades.telefonos ?? true,
            pie: actividades.pie ?? true,
            otros: actividades.otros ?? true,
            ccleaner: actividades.ccleaner ?? true,
            actualizaciones: actividades.actualizaciones ?? true,
            antivirus: actividades.antivirus ?? true,
            estadoDisco: actividades.estadoDisco ?? true,
            licenciaWindows: actividades.licenciaWindows ?? true,
            licenciaOffice: actividades.licenciaOffice ?? true,
            rendimientoEquipo: actividades.rendimientoEquipo ?? true,
            mantenimientoReloj: actividades.mantenimientoReloj ?? true,

          }
        });
      });
    }

    this.visitaForm.get('cliente')?.valueChanges.subscribe(clienteId => {
      console.log('Cliente seleccionado:', clienteId);
      this.empresaId = clienteId;
      if (clienteId) {
        this.api.getSolicitantes(clienteId).subscribe((res) => {
          this.todosSolicitantes = res.solicitantes || res || [];
          this.filtradosSolicitantes = [...this.todosSolicitantes];
          console.log(this.filtradosSolicitantes)
        },
          (error) => {
            console.error('Error al cargar solicitantes:', error);
          }
        );
      } else {
        this.todosSolicitantes = [];
        this.filtradosSolicitantes = [];
      }
    });

    this.username = localStorage.getItem('username') || '';
    this.tecnicoId = localStorage.getItem('tecnicoId') || '';

    if (!this.tecnicoId) {
      this.showToast('El técnico no está registrado correctamente. Intenta iniciar sesión nuevamente.');
      this.router.navigate(['/home']);
    }

    const allHistorial = JSON.parse(localStorage.getItem('visitas_registro') || '{}');
    if (this.username && allHistorial[this.username]) {
      this.visitas = allHistorial[this.username];
    } else {
      this.visitas = [];
    }
  }

  // ✅ NUEVO: Método para cargar Capacitor Geolocation solo cuando sea necesario
  private async cargarGeolocationCapacitor() {
  const { Geolocation } = await import('@capacitor/geolocation');
  const platform = Capacitor.getPlatform();
  // En móviles, exige plugin nativo
  if (platform === 'android' || platform === 'ios') {
    if ((Capacitor as any).isPluginAvailable?.('Geolocation')) return Geolocation;
    // plugin no registrado -> probablemente faltó `ionic cap sync`
    throw new Error('Geolocation plugin no disponible en nativo');
  }
  // Web (ionic serve)
  return null; // para que caiga a navigator.geolocation en la web
}

async probarPermiso() {
  try {
    const { Geolocation } = await import('@capacitor/geolocation');
    await Geolocation.requestPermissions();
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
    this.latitud  = pos.coords.latitude;
    this.longitud = pos.coords.longitude;
    this.showToast(`OK: ${this.latitud},${this.longitud}`);
  } catch (e) {
    console.error('Error permiso/posición:', e);
    this.showToast('No se pudo leer la posición');
  }
}

private async debugGeoOrigen() {
  const Geolocation = await this.cargarGeolocationCapacitor();
  const platform = Capacitor.getPlatform?.() ?? 'unknown';
  console.log('[GEO] Platform:', platform);
  console.log('[GEO] Plugin cargado?:', !!Geolocation);
  this.showToast(`platform: ${platform}`);
  this.showToast(`plugin: ${!!Geolocation}`);
  if (Geolocation?.checkPermissions) {
    const st = await Geolocation.checkPermissions();
    console.log('[GEO] Estado permisos:', st);
    this.showToast(`perm: ${JSON.stringify(st)}`);
  } else {
    console.log('[GEO] Sin checkPermissions -> probablemente usando navigator.geolocation');
  }
}

private async openAppSettings(): Promise<void> {
  const platform = Capacitor.getPlatform();
  try {
    if (platform === 'android') {
      await NativeSettings.openAndroid({ option: AndroidSettings.ApplicationDetails });
      // También puedes abrir directamente "Ubicación" del sistema:
      // await NativeSettings.openAndroid({ option: AndroidSettings.Location });
    } else if (platform === 'ios') {
      // Apple solo garantiza abrir los ajustes de TU app
      await NativeSettings.openIOS({ option: IOSSettings.App });
      // Alternativa sin plugin (también sirve):
      // await App.openUrl({ url: 'app-settings:' });
    } else {
      this.showToast('Abre los ajustes de permisos del navegador para habilitar ubicación.');
    }
  } catch (e) {
    console.error('No se pudo abrir Ajustes:', e);
    this.showToast('No se pudieron abrir los Ajustes.');
  }
}


  private async asegurarPermisosUbicacion(): Promise<boolean> {
  try {
    const Geolocation = await this.cargarGeolocationCapacitor();
    if (!Geolocation) return true; // web

    try {
      const st = await Geolocation.checkPermissions();
      if (st.location === 'granted' || st.coarseLocation === 'granted') return true;
    } catch { /* algunos OEM tiran error aquí; seguimos a request */ }

    const req = await Geolocation.requestPermissions();
    if (req.location === 'granted' || req.coarseLocation === 'granted') return true;

    const alert = await this.alertController.create({
      header: 'Permiso de ubicación',
      message: 'Necesitamos tu ubicación para registrar la visita. Actívala en Ajustes.',
      buttons: [{ text: 'Cancelar', role: 'cancel' }, { text: 'Abrir Ajustes', handler: () => this.openAppSettings() }]
    });
    await alert.present();
    return false;
  } catch (e) {
    console.error('[PERM] error', e);
    this.showToast(JSON.stringify(e))
    return false;
  }
}

// OBTENER COORDENADAS rápido (sin bloquear por dirección)
private async obtenerCoordenadasRapido(): Promise<{lat:number, lon:number}> {
  const Geolocation = await this.cargarGeolocationCapacitor();
  if (Geolocation) {
    const pos = await this.withTimeout(
      Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 }),
      5000,
      'getCurrentPosition'
    );
    return { lat: pos.coords.latitude, lon: pos.coords.longitude };
  } else {
    const pos = await this.withTimeout(this.obtenerPosicionNavegador(), 5000, 'navigator.geolocation');
    return { lat: pos.coords.latitude, lon: pos.coords.longitude };
  }
}
// Reverse geocoding NO bloqueante con timeout
private async intentarCargarDireccionBonita(lat:number, lon:number) {
  try {
    const texto = await this.withTimeout(
      this.obtenerDireccionExactaSantiago(lat, lon),
      3000,
      'reverse-geocoding'
    );
    this.direccionExacta = texto;
  } catch {
    this.direccionExacta = this.generarUbicacionSantiago(lat, lon);
  }
  this.visitaForm.get('direccion_visita')?.setValue(this.direccionExacta);
  this.ubicacionObtenida = true;
}


  // Método para obtener dirección con Ionic Native
 async obtenerDireccion(): Promise<void> {
  this.isLoadingLocation = true;
  this.ubicacionObtenida = false;

  try {
    // 1) Permisos
    const ok = await this.asegurarPermisosUbicacion();
    if (!ok) {
      this.showToast('Permiso de ubicación denegado.');
      return;
    }

    // 2) Obtener coordenadas (nativo si existe; web si no)
    let lat: number, lon: number;
    const Geolocation = await this.cargarGeolocationCapacitor();

    if (Geolocation) {
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });
      lat = pos.coords.latitude;
      lon = pos.coords.longitude;
    } else {
      const pos = await this.obtenerPosicionNavegador();
      lat = pos.coords.latitude;
      lon = pos.coords.longitude;
    }

    // 3) Guardar y resolver dirección legible
    this.latitud = lat;
    this.longitud = lon;

    try {
      this.direccionExacta = await this.obtenerDireccionExactaSantiago(lat, lon);
    } catch {
      this.direccionExacta = this.generarUbicacionSantiago(lat, lon);
    }

    this.visitaForm.get('direccion_visita')?.setValue(this.direccionExacta);
    this.ubicacionObtenida = true;

    console.log('📍 Coordenadas:', this.latitud, this.longitud);
    console.log('📍 Dirección:', this.direccionExacta);

  } catch (error) {
    console.error('❌ obtenerDireccion error:', error);
    this.visitaForm.get('direccion_visita')?.setValue('Ubicación no disponible');
    this.ubicacionObtenida = false;
    this.showToast('No se pudo obtener tu ubicación.');
  } finally {
    this.isLoadingLocation = false;
  }
}
  // ✅ MÉTODO ESPECÍFICO PARA SANTIAGO
  private async obtenerDireccionSantiago(lat: number, lon: number): Promise<string> {
    // Verificar que las coordenadas estén en el área de Santiago
    if (!this.estaEnSantiago(lat, lon)) {
      return this.generarUbicacionSantiago(lat, lon);
    }

    // Intentar con OpenStreetMap para dirección exacta
    try {
      const direccionExacta = await this.obtenerDireccionExactaSantiago(lat, lon);
      if (direccionExacta && direccionExacta.length > 15) {
        return direccionExacta;
      }
    } catch (error) {
      console.warn('No se pudo obtener dirección exacta:', error);
    }

    // Fallback: Ubicación aproximada en Santiago
    return this.generarUbicacionSantiago(lat, lon);
  }

  // ✅ VERIFICAR SI ESTÁ EN SANTIAGO
  private estaEnSantiago(lat: number, lon: number): boolean {
    // Coordenadas del área metropolitana de Santiago
    const esLatitudValida = lat > -33.6 && lat < -33.3;
    const esLongitudValida = lon > -70.9 && lon < -70.5;
    return esLatitudValida && esLongitudValida;
  }

  // ✅ OBTENER DIRECCIÓN EXACTA EN SANTIAGO
  private async obtenerDireccionExactaSantiago(lat: number, lon: number): Promise<string> {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=es`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'RidsMovilApp/1.0 (app@rids.cl)'
      }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    return this.formatearDireccionSantiago(data);
  }

  // ✅ FORMATEADOR ESPECIALIZADO EN SANTIAGO
  private formatearDireccionSantiago(data: any): string {
    const address = data.address;

    // Construir dirección en el formato típico de Santiago
    const partes = [];

    // 1. Calle y número (si existe)
    if (address.road) {
      let calle = address.road;
      if (address.house_number) {
        calle += ` #${address.house_number}`;
      }
      partes.push(calle);
    }

    // 2. Comuna (lo más importante en Santiago)
    if (address.suburb) {
      partes.push(address.suburb);
    } else if (address.city_district) {
      partes.push(address.city_district);
    } else if (address.municipality) {
      partes.push(address.municipality);
    }

    // 3. Siempre agregar "Santiago"
    if (!partes.includes('Santiago')) {
      partes.push('Santiago');
    }

    // 4. Agregar región
    partes.push('Región Metropolitana');

    const direccion = partes.join(', ');

    // Si la dirección es muy corta, usar el display_name completo
    if (direccion.length < 20 && data.display_name) {
      return data.display_name
        .replace(', Chile', '')
        .replace(', Región Metropolitana de Santiago', ', Región Metropolitana');
    }

    return direccion;
  }

  // ✅ GENERAR DESCRIPCIÓN DE UBICACIÓN EN SANTIAGO
  private generarUbicacionSantiago(lat: number, lon: number): string {
    const fecha = new Date().toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const comuna = this.detectarComunaSantiago(lat, lon);

    return `${comuna}, Santiago, Región Metropolitana\n\nCoordenadas: ${lat.toFixed(6)}, ${lon.toFixed(6)}\nObtenido: ${fecha}`;
  }

  // ✅ DETECTOR DE COMUNAS DE SANTIAGO (MUCHO MÁS PRECISO)
  private detectarComunaSantiago(lat: number, lon: number): string {
    // Coordenadas aproximadas de comunas de Santiago
    // Basado en ubicaciones geográficas reales

    // Santiago Centro y alrededores
    if (lat > -33.45 && lat < -33.42 && lon > -70.68 && lon < -70.64) {
      return 'Santiago Centro';
    }

    // Providencia, Ñuñoa
    if (lat > -33.44 && lat < -33.42 && lon > -70.62 && lon < -70.58) {
      if (lon > -70.60) return 'Providencia';
      return 'Ñuñoa';
    }

    // Las Condes, Vitacura, Lo Barnechea
    if (lat > -33.42 && lat < -33.38 && lon > -70.58 && lon < -70.55) {
      if (lat < -33.40) return 'Las Condes';
      if (lon > -70.57) return 'Vitacura';
      return 'Lo Barnechea';
    }

    // Maipú, Pudahuel
    if (lat > -33.52 && lat < -33.45 && lon > -70.75 && lon < -70.70) {
      return 'Maipú';
    }

    // Puente Alto, La Florida
    if (lat > -33.62 && lat < -33.52 && lon > -70.60 && lon < -70.55) {
      if (lat < -33.57) return 'Puente Alto';
      return 'La Florida';
    }

    // San Bernardo, El Bosque
    if (lat > -33.65 && lat < -33.55 && lon > -70.72 && lon < -70.65) {
      return 'San Bernardo';
    }

    // Quilicura, Huechuraba
    if (lat > -33.38 && lat < -33.33 && lon > -70.75 && lon < -70.68) {
      return 'Quilicura';
    }

    // Estación Central, Pedro Aguirre Cerda
    if (lat > -33.48 && lat < -33.45 && lon > -70.70 && lon < -70.65) {
      return 'Estación Central';
    }

    // Recoleta, Independencia
    if (lat > -33.42 && lat < -33.40 && lon > -70.66 && lon < -70.62) {
      return 'Recoleta';
    }

    // Si no coincide con comuna específica, determinar zona
    if (lat < -33.5) return 'Zona Sur de Santiago';
    if (lon < -70.7) return 'Zona Poniente de Santiago';
    if (lon > -70.58) return 'Zona Oriente de Santiago';

    return 'Santiago';
  }

  // ✅ Método auxiliar para mostrar alertas de ubicación
  private async mostrarAlertaUbicacion(mensaje: string): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Ubicación no disponible',
      message: mensaje,
      buttons: [
        {
          text: 'Entendido',
          role: 'cancel'
        }
      ]
    });
    await alert.present();
  }

  // ✅ Método para obtener posición en navegadores (sin cambios)
  private obtenerPosicionNavegador(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation no es soportado por este navegador'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      );
    });
  }

  // Método para obtener dirección desde coordenadas
  async obtenerDireccionDesdeCoordenadas(latitud: number, longitud: number): Promise<string> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitud}&lon=${longitud}&accept-language=es`
      );

      const data = await response.json();
      return data.display_name || 'Dirección no disponible';
    } catch (error) {
      console.warn('No se pudo obtener la dirección:', error);
      return 'Dirección no disponible';
    }
  }

  // Mostrar error de ubicación
  mostrarErrorUbicacion() {
    this.showToast('No se pudo obtener la dirección. Verifica los permisos de ubicación.');
  }

  private cargarVisitaEnCurso(): void {
    if (this.visitaState.tieneVisitaEnCurso()) {
      const state = this.visitaState.getCurrentState();

      this.visitaId = state.visitaId;
      this.inicio = state.inicio;
      this.visitaEnCurso = true;
      this.estado = 'En curso';
      this.estadoTexto = 'Tienes una visita en curso.';
      this.empresaId = state.empresaId || 0;

      // ✅ CARGAR COORDENADAS DESDE EL ESTADO
      if (state.coordenadas) {
        this.latitud = state.coordenadas.lat;
        this.longitud = state.coordenadas.lon;
        console.log('📍 Coordenadas cargadas desde estado:', this.latitud, this.longitud);
      }

      if (state.direccion_visita) {
        this.ubicacionObtenida = true;
        this.direccionExacta = state.direccion_visita;
        console.log('📍 Dirección cargada desde estado:', this.direccionExacta);
      }

      this.restaurarFormularioDesdeEstado(state);
      this.showToast('Visita en curso recuperada');
    }
  }

  private restaurarFormularioDesdeEstado(state: any): void {
    if (state.clienteId) {
      this.visitaForm.patchValue({
        cliente: state.clienteId
      });

      this.cargarSolicitantesPorCliente(state.clienteId, state.solicitantes);
    }

    if (state.actividades) {
      this.visitaForm.patchValue({
        actividades: state.actividades
      });
    }

    if (state.datosFormulario) {
      this.visitaForm.patchValue(state.datosFormulario);
    }

    if (state.direccion_visita) {
      this.visitaForm.patchValue({
        direccion_visita: state.direccion_visita
      });
    }
  }

  private cargarSolicitantesPorCliente(clienteId: number, solicitantesGuardados?: any[]): void {
    this.api.getSolicitantes(clienteId).subscribe(
      (res) => {
        this.todosSolicitantes = res.solicitantes || res || [];
        this.filtradosSolicitantes = [...this.todosSolicitantes];

        if (solicitantesGuardados && solicitantesGuardados.length > 0) {
          this.visitaForm.patchValue({
            solicitante: solicitantesGuardados
          });
          this.nombreSolicitanteSeleccionado = solicitantesGuardados
            .map((s: any) => s.nombre)
            .join(', ');
        }
      },
      (error) => {
        console.error('Error al cargar solicitantes:', error);
      }
    );
  }

  abrirListaSolicitantes() {
    if (!this.visitaForm.get('cliente')?.value) {
      this.showToast('Debes seleccionar una empresa antes de elegir un solicitante.');
      return;
    }
    this.mostrarListaSolicitantes = !this.mostrarListaSolicitantes;
  }

  

  seleccionarSolicitante(s: any) {
    const seleccionActual = this.visitaForm.get('solicitante')?.value || [];
    const existe = seleccionActual.find((item: any) => item.id_solicitante === s.id_solicitante);

    let nuevaSeleccion;

    if (existe) {
      nuevaSeleccion = seleccionActual.filter((item: any) => item.id_solicitante !== s.id_solicitante);
    } else {
      nuevaSeleccion = [...seleccionActual, s];
    }

    this.visitaForm.get('solicitante')?.setValue(nuevaSeleccion);
    this.nombreSolicitanteSeleccionado = nuevaSeleccion.map((item: any) => item.nombre).join(', ');

    if (this.visitaEnCurso) {
      this.visitaState.agregarSolicitantes(nuevaSeleccion);
    }
  }

  filtrarSolicitantes() {
    const term = this.visitaForm.get('busquedaSolicitante')?.value.toLowerCase() || '';
    this.filtradosSolicitantes = this.todosSolicitantes.filter((s: any) =>
      s.nombre.toLowerCase().includes(term)
    );
    console.log('Solicitantes filtrados:', this.filtradosSolicitantes);
  }

  esSolicitanteSeleccionado(s: any): boolean {
    return this.visitaForm.value.solicitante?.some(
      (item: any) => item.id_solicitante === s.id_solicitante
    );
  }

  eliminarSolicitante(s: any) {
    const actual = this.visitaForm.value.solicitante || [];
    const filtrados = actual.filter(
      (item: any) => item.id_solicitante !== s.id_solicitante
    );
    this.visitaForm.patchValue({ solicitante: filtrados });

    if (this.visitaEnCurso) {
      this.visitaState.agregarSolicitantes(filtrados);
    }
  }
// NUEVO flag arriba en la clase
private isStarting = false;
private withTimeout<T>(p: Promise<T>, ms: number, label = 'op'): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timeout (${ms}ms)`)), ms);
    p.then(v => { clearTimeout(t); resolve(v); })
     .catch(e => { clearTimeout(t); reject(e); });
  });
}

private resolvingAddress = false;

  // REEMPLAZA tu iniciarVisita() completo por este
async iniciarVisita() {
  const clienteId = this.visitaForm.value.cliente;
  if (!clienteId) { this.showToast('Selecciona un cliente.'); return; }

  try {
    const Geolocation = await this.cargarGeolocationCapacitor();
    if (Geolocation) {
      // chequea permiso antes de pedirlo (algunos OEM crashean si llamas request sin check)
      await Geolocation.checkPermissions().catch(() => null);
      await Geolocation.requestPermissions();
    }

    // Intenta posición; si tarda >6s, seguimos sin coords
    let lat: number | null = null, lon: number | null = null;

    try {
      if (Geolocation) {
        const pos = await Promise.race([
          Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 }),
          new Promise<never>((_, rej) => setTimeout(() => rej(new Error('gps-timeout')), 6000)),
        ]);
        // @ts-ignore
        lat = pos.coords.latitude; lon = pos.coords.longitude;
      } else {
        const pos = await Promise.race([
          this.obtenerPosicionNavegador(),
          new Promise<never>((_, rej) => setTimeout(() => rej(new Error('gps-timeout')), 6000)),
        ]);
        lat = pos.coords.latitude; lon = pos.coords.longitude;
      }
    } catch (e) {
      console.warn('GPS lento/fallo, seguimos sin coords', e);
      // Opcional: ofrece abrir ajustes si viene de denegado permanente
      await this.verificarYOfrecerAjustesAndroid();
    }

    // Crea visita YA
    const visitaData = {
      empresaId: clienteId,
      solicitante: this.visitaForm.value.solicitante,
      inicio: new Date(),
      tecnicoId: this.tecnicoId,
      direccion_visita: (lat!=null && lon!=null) ? `${lat},${lon}` : null
    };

    this.showToast('Creando visita…');
    this.api.crearVisita(visitaData).subscribe(
      async (response: any) => {
        this.visitaId = response?.visita?.id_visita;
        if (!this.visitaId) { this.showToast('Backend no devolvió id_visita.'); return; }

        this.inicio = new Date();
        this.visitaEnCurso = true;
        this.estado = 'En curso';
        this.estadoTexto = 'La visita ha comenzado.';

        // dispara resolve de dirección si tenemos coords
        if (lat!=null && lon!=null && !this.resolvingAddress) {
          this.resolvingAddress = true;
          try {
            this.direccionExacta = await Promise.race([
              this.obtenerDireccionExactaSantiago(lat, lon),
              new Promise<string>((_, rej)=>setTimeout(()=>rej(new Error('revgeo-timeout')), 3000))
            ]).catch(()=> this.generarUbicacionSantiago(lat!, lon!)) as string;
            this.visitaForm.get('direccion_visita')?.setValue(this.direccionExacta);
            this.ubicacionObtenida = true;
          } finally { this.resolvingAddress = false; }
        }

        this.showToast('Visita iniciada.');
      },
      (err) => { console.error(err); this.showToast('No se pudo iniciar la visita.'); }
    );

  } catch (e) {
    console.error('iniciarVisita error', e);
    this.showToast('Error al iniciar: ' + String(e));
  }
}

private async verificarYOfrecerAjustesAndroid() {
  try {
    const { Geolocation } = await import('@capacitor/geolocation');
    const st = await Geolocation.checkPermissions();
    const denied = st.location === 'denied' || st.coarseLocation === 'denied';
    if (denied) {
      const alert = await this.alertController.create({
        header: 'Permiso de ubicación',
        message: 'La app no tiene permiso de ubicación. Ábrelo en Ajustes para continuar.',
        buttons: [
          { text: 'Cancelar', role: 'cancel' },
          { text: 'Abrir Ajustes', handler: () => this.openAppSettings() }
        ]
      });
      await alert.present();
    }
  } catch {}
}


async smokeGPS() {
  try {
    const { Geolocation } = await import('@capacitor/geolocation');
    await Geolocation.requestPermissions();

    const t = setTimeout(() => {
      this.showToast('GPS timeout (8s)');
    }, 8000);

    this.showToast('Leyendo posición…');
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 7000,      // Android a veces ignora este timeout; por eso el setTimeout arriba
    });
    clearTimeout(t);

    this.latitud  = pos.coords.latitude;
    this.longitud = pos.coords.longitude;
    this.showToast(`POS OK: ${this.latitud}, ${this.longitud}`);
    console.log('POS OK', pos);
  } catch (e) {
    console.error('smokeGPS error', e);
    this.showToast('POS ERROR: ' + String(e));
  }
}


  // Terminar visita con obtención automática de dirección actualizada
  async terminarVisita() {
    if (!this.visitaId) {
      const alert = await this.alertController.create({
        header: 'Error',
        message: 'No se ha iniciado ninguna visita. Por favor, inicia una visita antes de finalizarla.',
        buttons: ['Aceptar']
      });
      await alert.present();
      return;
    }

    this.visitaForm.markAllAsTouched();
    if (this.visitaForm.invalid) {
      const alert = await this.alertController.create({
        header: 'Formulario incompleto',
        message: 'Por favor, completa todos los campos obligatorios antes de terminar la visita.',
        buttons: ['Aceptar']
      });
      await alert.present();
      return;
    }

    // Obtener dirección actualizada al finalizar
    await this.obtenerDireccion();

    this.fin = new Date();
    this.visitaEnCurso = false;
    this.estado = 'Completada';
    this.estadoTexto = 'La visita ha sido registrada.';

    const actividades = this.visitaForm.get('actividades')?.value || {};
    const seleccion = this.visitaForm.get('solicitante')?.value as any[];

    if (!Array.isArray(seleccion) || seleccion.length === 0) {
      this.showToast('Por favor, selecciona al menos un solicitante.');
      return;
    }

    // ✅ SOLUCIÓN: Formatear coordenadas para el backend
    const direccionParaBackend = (this.latitud != null && this.longitud != null)
  ? `${this.latitud},${this.longitud}`
  : null;

    const data = {
      confImpresoras: actividades.impresoras,
      confTelefonos: actividades.telefonos,
      confPiePagina: actividades.pie,
      otros: actividades.otros,
      ccleaner: actividades.ccleaner,
      actualizaciones: actividades.actualizaciones,
      antivirus: actividades.antivirus,
      estadoDisco: actividades.estadoDisco,
      licenciaWindows: actividades.licenciaWindows,
      licenciaOffice: actividades.licenciaOffice,
      rendimientoEquipo: actividades.rendimientoEquipo,
      mantenimientoReloj: actividades.mantenimientoReloj,
      otrosDetalle: this.visitaForm.value.otrosDetalle,
      solicitantes: seleccion,
      direccion_visita: direccionParaBackend  // ← Enviar coordenadas formateadas
    };

    console.log('🎯 DATOS FINALIZACIÓN:');
    console.log('- direccion_visita (coordenadas):', data.direccion_visita);
    console.log('- dirección mostrada al usuario:', this.direccionExacta);

    this.api.completarVisita(this.visitaId, data).subscribe(
      (response: any) => {
        console.log('✅ RESPUESTA BACKEND:', response);
        this.guardarVisita();
        this.visitaState.clearState();
        this.showToast('Visita finalizada con éxito');
      },
      async (error) => {
        const alert = await this.alertController.create({
          header: 'Error',
          message: 'No se pudo finalizar la visita. Intenta de nuevo.',
          buttons: ['Aceptar']
        });
        await alert.present();
        console.error('Error al finalizar la visita:', error);
      }
    );
  }

  resetFormulario() {
    this.visitaForm.reset();
    this.inicio = null;
    this.fin = null;
    this.visitaEnCurso = false;
    this.estado = 'Sin iniciar';
    this.estadoTexto = 'Listo para iniciar una visita.';
    this.visitaId = null;
    this.filtradosSolicitantes = [];
    this.ubicacionObtenida = false;

    this.visitaState.clearState();
  }

  minWordsValidator(minWords: number, minChars: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value || typeof control.value !== 'string') {
        return { minWordsOrChars: true };
      }
      const wordCount = control.value.trim().split(/\s+/).filter(w => w.length > 0).length;
      const charCount = control.value.trim().length;
      return (wordCount < minWords && charCount < minChars) ? { minWordsOrChars: true } : null;
    };
  }

  guardarVisita() {
    const inicioFmt = this.inicio ? this.datePipe.transform(this.inicio, 'dd/MM/yyyy HH:mm', '', 'es-CL') : null;
    const finFmt = this.fin ? this.datePipe.transform(this.fin, 'dd/MM/yyyy HH:mm', '', 'es-CL') : null;

    const data = {
      ...this.visitaForm.value,
      inicio: inicioFmt,
      fin: finFmt,
      username: this.username
    };

    this.visitas.push(data);

    const allHistorial = JSON.parse(localStorage.getItem('visitas_registro') || '{}');
    allHistorial[this.username] = this.visitas;
    localStorage.setItem('visitas_registro', JSON.stringify(allHistorial));
  }

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000
    });
    await toast.present();
  }
}