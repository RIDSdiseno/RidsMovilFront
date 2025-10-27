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
  private isStarting = false;
  private resolvingAddress = false;

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

  // ========== MÉTODOS DE GEOLOCALIZACIÓN MEJORADOS (GRATUITOS) ==========

  private async cargarGeolocationCapacitor() {
    const { Geolocation } = await import('@capacitor/geolocation');
    const platform = Capacitor.getPlatform();
    if (platform === 'android' || platform === 'ios') {
      if ((Capacitor as any).isPluginAvailable?.('Geolocation')) return Geolocation;
      throw new Error('Geolocation plugin no disponible en nativo');
    }
    return null;
  }

  private async debugGeoOrigen() {
    const Geolocation = await this.cargarGeolocationCapacitor();
    const platform = Capacitor.getPlatform?.() ?? 'unknown';
    console.log('[GEO] Platform:', platform);
    console.log('[GEO] Plugin cargado?:', !!Geolocation);
  }

  private async openAppSettings(): Promise<void> {
    const platform = Capacitor.getPlatform();
    try {
      if (platform === 'android') {
        await NativeSettings.openAndroid({ option: AndroidSettings.ApplicationDetails });
      } else if (platform === 'ios') {
        await NativeSettings.openIOS({ option: IOSSettings.App });
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
      if (!Geolocation) return true;

      try {
        const st = await Geolocation.checkPermissions();
        if (st.location === 'granted' || st.coarseLocation === 'granted') return true;
      } catch { }

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
      return false;
    }
  }

  // ✅ MÉTODO PRINCIPAL MEJORADO - SOLUCIÓN GRATUITA SIN CORS
  async obtenerDireccion(): Promise<void> {
    this.isLoadingLocation = true;
    this.ubicacionObtenida = false;

    try {
      // 1. Obtener permisos
      const ok = await this.asegurarPermisosUbicacion();
      if (!ok) {
        this.showToast('Permiso de ubicación denegado.');
        return;
      }

      // 2. Obtener coordenadas
      const { lat, lon } = await this.obtenerCoordenadasPrecisas();
      this.latitud = lat;
      this.longitud = lon;

      console.log('📍 Coordenadas obtenidas:', lat, lon);

      // 3. Obtener dirección con método gratuito mejorado
      this.direccionExacta = await this.obtenerDireccionExactaGratuita(lat, lon);

      this.visitaForm.get('direccion_visita')?.setValue(this.direccionExacta);
      this.ubicacionObtenida = true;

      console.log('✅ Dirección obtenida sin CORS:', this.direccionExacta);

    } catch (error: any) {
      console.error('❌ Error obteniendo ubicación:', error);
      this.manejarErrorUbicacion(error);
    } finally {
      this.isLoadingLocation = false;
    }
  }

  // ✅ OBTENER DIRECCIÓN EXACTA GRATUITA (SIN CORS)
  private async obtenerDireccionExactaGratuita(lat: number, lon: number): Promise<string> {
    try {
      // Intentar con diferentes proxies gratuitos
      return await this.intentarConMultiplesProxies(lat, lon);
    } catch (error) {
      console.warn('Todos los proxies fallaron, usando método local:', error);
      return this.generarDireccionLocalMejorada(lat, lon);
    }
  }

  // ✅ INTENTAR CON MÚLTIPLES PROXIES GRATUITOS
  private async intentarConMultiplesProxies(lat: number, lon: number): Promise<string> {
    const targetUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=es`;

    const proxies = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
      `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
      `https://cors-anywhere.herokuapp.com/${targetUrl}`,
    ];

    for (const proxyUrl of proxies) {
      try {
        console.log(`Intentando con proxy: ${proxyUrl.substring(0, 50)}...`);
        const direccion = await this.obtenerDireccionConProxy(proxyUrl);
        if (direccion && direccion.length > 10) {
          return direccion;
        }
      } catch (error) {
        console.warn(`Proxy falló:`, error);
        continue;
      }
    }

    throw new Error('Todos los proxies fallaron');
  }

  // ✅ OBTENER DIRECCIÓN CON PROXY ESPECÍFICO
  private async obtenerDireccionConProxy(proxyUrl: string): Promise<string> {
    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'RidsMovilApp/1.0 (app@rids.cl)'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return this.formatearDireccionOpenStreetMapMejorada(data);
  }

  // ✅ FORMATEADOR MEJORADO PARA OPENSTREETMAP
  private formatearDireccionOpenStreetMapMejorada(data: any): string {
    const address = data.address;
    const partes = [];

    // 1. Calle y número
    if (address.road) {
      let calle = address.road;
      const numero = address.house_number || address.housenumber;
      if (numero) {
        calle += ` #${numero}`;
      }
      partes.push(calle);
    }

    // 2. Barrio o sector
    if (address.suburb && !this.esBarrioGenerico(address.suburb)) {
      partes.push(address.suburb);
    } else if (address.neighbourhood) {
      partes.push(address.neighbourhood);
    }

    // 3. Comuna
    const comuna = this.obtenerComunaDesdeOSM(address);
    if (comuna) {
      partes.push(comuna);
    }

    // 4. Siempre agregar Santiago y Región
    if (!partes.includes('Santiago')) {
      partes.push('Santiago');
    }
    partes.push('Región Metropolitana');

    const direccion = partes.join(', ');

    // 5. Si la dirección es muy genérica, mejorar con display_name
    if (this.esDireccionMuyGenerica(direccion) && data.display_name) {
      return this.mejorarDireccionConDisplayName(data.display_name);
    }

    return direccion;
  }

  // ✅ DETECTAR COMUNA DESDE OPENSTREETMAP
  private obtenerComunaDesdeOSM(address: any): string {
    const posiblesCampos = ['city_district', 'municipality', 'suburb', 'borough'];

    for (const campo of posiblesCampos) {
      if (address[campo] && this.esComunaValidaSantiago(address[campo])) {
        return address[campo];
      }
    }
    return '';
  }

  // ✅ VERIFICAR SI ES UNA COMUNA VÁLIDA DE SANTIAGO
  private esComunaValidaSantiago(nombre: string): boolean {
    const comunasSantiago = [
      'Santiago', 'Providencia', 'Ñuñoa', 'Las Condes', 'Vitacura', 'La Reina',
      'Macul', 'Peñalolén', 'La Florida', 'Puente Alto', 'San Bernardo',
      'Maipú', 'Estación Central', 'Quilicura', 'Huechuraba', 'Recoleta',
      'Independencia', 'Conchalí', 'Quinta Normal', 'Lo Prado', 'Pudahuel',
      'Cerro Navia', 'Lo Barnechea', 'San Miguel', 'La Cisterna', 'El Bosque',
      'Pedro Aguirre Cerda', 'San Joaquín', 'La Granja', 'La Pintana'
    ];

    return comunasSantiago.some(comuna =>
      nombre.toLowerCase().includes(comuna.toLowerCase())
    );
  }

  // ✅ MEJORAR DIRECCIÓN CON DISPLAY_NAME
  private mejorarDireccionConDisplayName(displayName: string): string {
    let direccion = displayName
      .replace(', Chile', '')
      .replace(', Región Metropolitana de Santiago', '')
      .replace(', Metropolitana de Santiago', '')
      .trim();

    const partes = direccion.split(',').map(part => part.trim());
    const partesRelevantes = partes.slice(0, Math.min(4, partes.length));

    if (!partesRelevantes[partesRelevantes.length - 1].includes('Región Metropolitana')) {
      partesRelevantes.push('Región Metropolitana');
    }

    return partesRelevantes.join(', ');
  }

  // ✅ GENERAR DIRECCIÓN LOCAL MEJORADA
  private generarDireccionLocalMejorada(lat: number, lon: number): string {
    const comuna = this.detectarComunaSantiago(lat, lon);
    const sector = this.detectarSectorEspecifico(lat, lon);
    const callePrincipal = this.obtenerCallePrincipalCercana(lat, lon);

    const partes = [];

    if (callePrincipal) {
      partes.push(callePrincipal);
    }

    if (sector) {
      partes.push(sector);
    }

    partes.push(comuna, 'Santiago', 'Región Metropolitana');

    return partes.join(', ');
  }

  // ✅ DETECTAR SECTOR ESPECÍFICO
  private detectarSectorEspecifico(lat: number, lon: number): string {
    const sectores = [
      { minLat: -33.43, maxLat: -33.41, minLon: -70.61, maxLon: -70.59, nombre: 'Plaza Ñuñoa' },
      { minLat: -33.45, maxLat: -33.43, minLon: -70.68, maxLon: -70.66, nombre: 'Barrio Yungay' },
      { minLat: -33.42, maxLat: -33.40, minLon: -70.62, maxLon: -70.60, nombre: 'Barrio Italia' },
      { minLat: -33.41, maxLat: -33.39, minLon: -70.58, maxLon: -70.56, nombre: 'Apumanque' },
      { minLat: -33.40, maxLat: -33.38, minLon: -70.57, maxLon: -70.55, nombre: 'Parque Araucano' },
      { minLat: -33.52, maxLat: -33.50, minLon: -70.76, maxLon: -70.74, nombre: 'Plana de Maipú' },
    ];

    for (const sector of sectores) {
      if (lat >= sector.minLat && lat <= sector.maxLat &&
        lon >= sector.minLon && lon <= sector.maxLon) {
        return sector.nombre;
      }
    }
    return '';
  }

  // ✅ OBTENER CALLE PRINCIPAL CERCANA
  private obtenerCallePrincipalCercana(lat: number, lon: number): string {
    const callesPrincipales = [
      { lat: -33.4489, lon: -70.6619, calle: 'Av. Libertador Bernardo O Higgins' },
      { lat: -33.4378, lon: -70.6503, calle: 'Av. Matucana' },
      { lat: -33.4255, lon: -70.6142, calle: 'Av. Irarrázaval' },
      { lat: -33.4189, lon: -70.6063, calle: 'Av. Pedro de Valdivia' },
      { lat: -33.4158, lon: -70.6062, calle: 'Av. Providencia' },
      { lat: -33.4086, lon: -70.6044, calle: 'Av. Apoquindo' },
      { lat: -33.4522, lon: -70.6792, calle: 'Av. San Pablo' },
      { lat: -33.5225, lon: -70.7028, calle: 'Av. Pajaritos' },
      { lat: -33.5003, lon: -70.6153, calle: 'Av. Vicuña Mackenna' },
    ];

    let calleMasCercana = '';
    let distanciaMinima = Infinity;

    for (const calle of callesPrincipales) {
      const distancia = this.calcularDistancia(lat, lon, calle.lat, calle.lon);
      if (distancia < 1 && distancia < distanciaMinima) {
        distanciaMinima = distancia;
        calleMasCercana = calle.calle;
      }
    }
    return calleMasCercana;
  }

  // ✅ MÉTODOS DE UTILIDAD
  private calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.gradosARadianes(lat2 - lat1);
    const dLon = this.gradosARadianes(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.gradosARadianes(lat1)) * Math.cos(this.gradosARadianes(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private gradosARadianes(grados: number): number {
    return grados * (Math.PI / 180);
  }

  private esDireccionMuyGenerica(direccion: string): boolean {
    return direccion.length < 25 ||
      direccion.includes('Santiago, Santiago') ||
      !direccion.includes('#');
  }

  private esBarrioGenerico(barrio: string): boolean {
    const genericos = ['centro', 'center', 'downtown'];
    return genericos.some(gen => barrio.toLowerCase().includes(gen));
  }

  private manejarErrorUbicacion(error: any): void {
    this.direccionExacta = 'Ubicación no disponible';
    this.ubicacionObtenida = false;

    if (error?.code === 1) {
      this.showToast('Permiso de ubicación denegado. Actívalo en ajustes.');
    } else if (error?.code === 2 || error?.code === 3) {
      this.showToast('No se pudo obtener ubicación. Verifica GPS/conexión.');
    } else {
      this.showToast('Error obteniendo dirección precisa.');
    }
  }

  // ✅ OBTENER COORDENADAS PRECISAS
  private async obtenerCoordenadasPrecisas(): Promise<{ lat: number, lon: number }> {
    const Geolocation = await this.cargarGeolocationCapacitor();

    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    };

    if (Geolocation) {
      const position = await Geolocation.getCurrentPosition(options);
      return {
        lat: position.coords.latitude,
        lon: position.coords.longitude
      };
    } else {
      const position = await this.obtenerPosicionNavegador();
      return {
        lat: position.coords.latitude,
        lon: position.coords.longitude
      };
    }
  }

  // ✅ MÉTODO PARA OBTENER POSICIÓN EN NAVEGADORES
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

  // ========== MÉTODOS EXISTENTES (SIN CAMBIOS) ==========

  private cargarVisitaEnCurso(): void {
    if (this.visitaState.tieneVisitaEnCurso()) {
      const state = this.visitaState.getCurrentState();

      this.visitaId = state.visitaId;
      this.inicio = state.inicio;
      this.visitaEnCurso = true;
      this.estado = 'En curso';
      this.estadoTexto = 'Tienes una visita en curso.';
      this.empresaId = state.empresaId || 0;

      if (state.coordenadas) {
        this.latitud = state.coordenadas.lat;
        this.longitud = state.coordenadas.lon;
      }

      if (state.direccion_visita) {
        this.ubicacionObtenida = true;
        this.direccionExacta = state.direccion_visita;
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

  // ✅ DETECTOR DE COMUNAS DE SANTIAGO
  private detectarComunaSantiago(lat: number, lon: number): string {
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

  async smokeGPS() {
    try {
      const coords = await this.obtenerCoordenadasPrecisas();
      console.log('📍 Coordenadas obtenidas (smokeGPS):', coords);
      this.showToast(`Lat: ${coords.lat}, Lon: ${coords.lon}`);
    } catch (error) {
      console.error('❌ Error en smokeGPS:', error);
      this.showToast('No se pudieron obtener coordenadas.');
    }
  }

  async probarPermiso() {
    const granted = await this.asegurarPermisosUbicacion();
    this.showToast(granted ? '✅ Permiso otorgado' : '❌ Permiso denegado');
  }

  // ✅ MÉTODO INICIAR VISITA MEJORADO
  async iniciarVisita() {
    const clienteId = this.visitaForm.value.cliente;
    if (!clienteId) {
      this.showToast('Selecciona un cliente.');
      return;
    }

    try {
      const Geolocation = await this.cargarGeolocationCapacitor();
      if (Geolocation) {
        await Geolocation.checkPermissions().catch(() => null);
        await Geolocation.requestPermissions();
      }

      // Obtener coordenadas rápidamente
      let coords: { lat: number | null; lon: number | null } = { lat: null, lon: null };
      try {
        coords = await this.obtenerCoordenadasPrecisas();
        this.latitud = coords.lat;
        this.longitud = coords.lon;

        // ✅ Solo ejecutar si hay coordenadas válidas
        if (coords.lat !== null && coords.lon !== null) {
          this.obtenerDireccionEnSegundoPlano(coords.lat, coords.lon);
        }

      } catch (e) {
        console.warn('No se pudieron obtener coordenadas:', e);
        this.direccionExacta = 'Ubicación no disponible';
      }


      // Crear visita inmediatamente
      const visitaData = {
        empresaId: clienteId,
        solicitante: this.visitaForm.value.solicitante,
        inicio: new Date(),
        tecnicoId: this.tecnicoId,
        direccion_visita: (coords.lat && coords.lon) ? `${coords.lat},${coords.lon}` : null
      };

      this.showToast('Creando visita…');

      this.api.crearVisita(visitaData).subscribe(
        (response: any) => {
          this.visitaId = response?.visita?.id_visita;
          if (!this.visitaId) {
            this.showToast('Backend no devolvió id_visita.');
            return;
          }

          this.inicio = new Date();
          this.visitaEnCurso = true;
          this.estado = 'En curso';
          this.estadoTexto = 'La visita ha comenzado.';

          this.visitaState.iniciarVisita({
            visitaId: this.visitaId,
            empresaId: clienteId,
            clienteId: clienteId,
            direccion_visita: this.direccionExacta,
            coordenadas: { lat: this.latitud, lon: this.longitud }
          });

          this.showToast('Visita iniciada correctamente.');
        },
        (err) => {
          console.error(err);
          this.showToast('No se pudo iniciar la visita.');
        }
      );

    } catch (e) {
      console.error('iniciarVisita error', e);
      this.showToast('Error al iniciar: ' + String(e));
    }
  }

  // ✅ OBTENER DIRECCIÓN EN SEGUNDO PLANO
  private async obtenerDireccionEnSegundoPlano(lat: number, lon: number): Promise<void> {
    try {
      const direccion = await this.obtenerDireccionExactaGratuita(lat, lon);
      this.direccionExacta = direccion;
      this.visitaForm.get('direccion_visita')?.setValue(this.direccionExacta);
      this.ubicacionObtenida = true;

      if (this.visitaEnCurso) {
        this.visitaState.updateState({
          direccion_visita: this.direccionExacta
        });
      }
    } catch (error) {
      console.warn('No se pudo obtener dirección en segundo plano:', error);
    }
  }

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
      direccion_visita: direccionParaBackend
    };

    console.log('🎯 DATOS FINALIZACIÓN:');
    console.log('- direccion_visita (coordenadas para backend):', data.direccion_visita);
    console.log('- Dirección mostrada al usuario:', this.direccionExacta);

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