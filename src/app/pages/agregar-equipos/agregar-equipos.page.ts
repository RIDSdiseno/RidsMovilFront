import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastController, LoadingController } from '@ionic/angular';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ApiService } from 'src/app/services/api';
import { Router } from '@angular/router';

@Component({
  selector: 'app-agregar-equipos',
  templateUrl: './agregar-equipos.page.html',
  styleUrls: ['./agregar-equipos.page.scss'],
  standalone: false,
})
export class AgregarEquiposPage implements OnInit, OnDestroy {
  equipoForm: FormGroup;
  equipoIndividualForm: FormGroup;
  clientes: any[] = [];
  todosSolicitantes: any[] = [];
  filtradosSolicitantes: any[] = [];
  mostrarListaSolicitantes = false;
  cargandoSolicitantes = false;
  mostrarFormularioEquipo = false;
  solicitanteSeleccionadoParaEquipo: any = null;

  // Variables para el swipe
  private swipeCoord?: [number, number];
  private swipeTime?: number;
  private swipeEnabled = true; // Control para habilitar/deshabilitar swipe

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private router: Router,
  ) {
    this.equipoForm = this.fb.group({
      cliente: ['', Validators.required],
      solicitante: [null, Validators.required],
      busquedaSolicitante: [''],
    });

    this.equipoIndividualForm = this.fb.group({
      serial: ['', [Validators.required, Validators.minLength(2)]],
      marca: ['', [Validators.required, Validators.minLength(2)]],
      modelo: ['', [Validators.required, Validators.minLength(2)]],
      procesador: [''],
      ram: [''],
      disco: [''],
      propiedad: ['']
    });
  }

  ngOnInit() {
    this.cargarClientes();

    this.equipoForm.get('cliente')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe((clienteId) => {
      if (clienteId) {
        this.cargarSolicitantes(clienteId);
      } else {
        this.limpiarSolicitantes();
      }
    });

    this.equipoForm.get('busquedaSolicitante')?.valueChanges.pipe(
      takeUntil(this.destroy$),
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(term => this.filtrarSolicitantes(term));
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // MEJORA: Gestos táctiles mejorados con prevención de conflictos
  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    // No procesar swipe si hay modales abiertos o formularios activos
    if (this.mostrarListaSolicitantes || this.mostrarFormularioEquipo) {
      return;
    }

    // No procesar si el toque es en un input, botón o elemento interactivo
    const target = event.target as HTMLElement;
    if (this.isInteractiveElement(target)) {
      return;
    }

    this.swipeCoord = [event.changedTouches[0].clientX, event.changedTouches[0].clientY];
    this.swipeTime = new Date().getTime();
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent) {
    // No procesar swipe si hay modales abiertos o formularios activos
    if (this.mostrarListaSolicitantes || this.mostrarFormularioEquipo) {
      return;
    }

    if (!this.swipeCoord || !this.swipeTime) return;

    const target = event.target as HTMLElement;
    if (this.isInteractiveElement(target)) {
      return;
    }

    const coord: [number, number] = [event.changedTouches[0].clientX, event.changedTouches[0].clientY];
    const time = new Date().getTime();

    const direction = [coord[0] - this.swipeCoord[0], coord[1] - this.swipeCoord[1]];
    const duration = time - this.swipeTime;

    // MEJORA: Detección más precisa de swipe horizontal
    if (duration < 1000 &&
      Math.abs(direction[0]) > 50 && // Aumentado a 50px para mayor precisión
      Math.abs(direction[0]) > Math.abs(direction[1]) * 2) { // Mejor relación X/Y

      if (direction[0] > 0) {
        this.goToPreviousPage(); // Swipe derecho
      } else {
        this.goToNextPage(); // Swipe izquierdo
      }
    }

    // Resetear coordenadas
    this.swipeCoord = undefined;
    this.swipeTime = undefined;
  }

  // MEJORA: Método para detectar elementos interactivos
  private isInteractiveElement(element: HTMLElement): boolean {
    const interactiveTags = ['INPUT', 'BUTTON', 'ION-BUTTON', 'ION-SELECT', 'ION-CHECKBOX', 'ION-RADIO'];
    const interactiveRoles = ['button', 'link', 'checkbox', 'radio', 'slider'];

    // Verificar por tag name
    if (interactiveTags.includes(element.tagName)) {
      return true;
    }

    // Verificar por role
    const role = element.getAttribute('role');
    if (role && interactiveRoles.includes(role)) {
      return true;
    }

    // Verificar si es contenido editable
    if (element.isContentEditable) {
      return true;
    }

    // Verificar si tiene un padre interactivo
    let parent = element.parentElement;
    while (parent) {
      if (interactiveTags.includes(parent.tagName) ||
        (parent.getAttribute('role') && interactiveRoles.includes(parent.getAttribute('role')!))) {
        return true;
      }
      parent = parent.parentElement;
    }

    return false;
  }

  goToNextPage() {
    const currentUrl = this.router.url;
    const pageOrder = ['/inicio-footer', '/formulario-visitas', '/equipos', '/perfil'];
    const currentIndex = pageOrder.indexOf(currentUrl);

    if (currentIndex !== -1 && currentIndex < pageOrder.length - 1) {
      this.router.navigate([pageOrder[currentIndex + 1]]);
    } else {
      this.router.navigate([pageOrder[0]]);
    }
  }

  goToPreviousPage() {
    const currentUrl = this.router.url;
    const pageOrder = ['/inicio-footer', '/formulario-visitas', '/equipos', '/perfil'];
    const currentIndex = pageOrder.indexOf(currentUrl);

    if (currentIndex !== -1 && currentIndex > 0) {
      this.router.navigate([pageOrder[currentIndex - 1]]);
    } else {
      this.router.navigate([pageOrder[pageOrder.length - 1]]);
    }
  }

  // MEJORA: Método para habilitar/deshabilitar swipe temporalmente
  setSwipeEnabled(enabled: boolean) {
    this.swipeEnabled = enabled;
  }

  seleccionarSolicitante(s: any) {
    if (this.esSolicitanteSeleccionado(s)) {
      this.equipoForm.patchValue({ solicitante: null });
    } else {
      this.equipoForm.patchValue({ solicitante: s });
    }
  }

  esSolicitanteSeleccionado(s: any): boolean {
    const solicitanteActual = this.equipoForm.value.solicitante;
    return solicitanteActual && solicitanteActual.id_solicitante === s.id_solicitante;
  }

  eliminarSolicitante() {
    this.equipoForm.patchValue({ solicitante: null });
  }

  abrirFormularioEquipo() {
    const solicitante = this.equipoForm.value.solicitante;
    if (!solicitante) {
      this.showToast('Primero selecciona un solicitante');
      return;
    }

    this.solicitanteSeleccionadoParaEquipo = solicitante;
    this.mostrarFormularioEquipo = true;
    this.equipoIndividualForm.reset();
  }

  // MEJORA: Métodos modificados para manejar estados de swipe
  abrirListaSolicitantes() {
    if (!this.equipoForm.get('cliente')?.value) {
      this.showToast('Selecciona una empresa antes de elegir solicitantes.');
      return;
    }
    this.mostrarListaSolicitantes = true;
    this.setSwipeEnabled(false); // Deshabilitar swipe cuando el modal está abierto
  }

  cerrarFormularioEquipo() {
    this.mostrarFormularioEquipo = false;
    this.solicitanteSeleccionadoParaEquipo = null;
    this.equipoIndividualForm.reset();
    this.setSwipeEnabled(true); // Rehabilitar swipe al cerrar
  }

  cargarClientes() {
    this.api.getClientes().subscribe(
      (data) => this.clientes = data,
      (error) => {
        console.error('Error al cargar empresas:', error);
        this.showToast('Error al cargar las empresas');
      }
    );
  }

  cargarSolicitantes(clienteId: string) {
    this.cargandoSolicitantes = true;
    this.api.getSolicitantes(Number(clienteId)).subscribe(
      (res) => {
        this.todosSolicitantes = res.solicitantes || res || [];
        this.filtradosSolicitantes = [...this.todosSolicitantes];
        this.cargandoSolicitantes = false;
      },
      (error) => {
        console.error('Error al cargar solicitantes:', error);
        this.showToast('Error al cargar los solicitantes');
        this.cargandoSolicitantes = false;
        this.limpiarSolicitantes();
      }
    );
  }

  private limpiarSolicitantes() {
    this.todosSolicitantes = [];
    this.filtradosSolicitantes = [];
    this.equipoForm.patchValue({
      solicitante: null,
      busquedaSolicitante: ''
    });
  }

  filtrarSolicitantes(term?: string) {
    const searchTerm = term?.toLowerCase() ||
      this.equipoForm.get('busquedaSolicitante')?.value?.toLowerCase() || '';

    this.filtradosSolicitantes = this.todosSolicitantes.filter((s: any) =>
      s.nombre.toLowerCase().includes(searchTerm)
    );
  }

  async crearEquipo() {
    if (this.equipoIndividualForm.invalid) {
      this.marcarCamposEquipoComoSucios();
      return;
    }

    if (!this.solicitanteSeleccionadoParaEquipo) {
      this.showToast('No hay solicitante seleccionado');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Creando equipo...',
    });
    await loading.present();

    const equipoData = {
      idSolicitante: this.solicitanteSeleccionadoParaEquipo.id_solicitante,
      ...this.equipoIndividualForm.value
    };

    this.api.crearEquipo(equipoData).subscribe(
      async (response: any) => {
        await loading.dismiss();
        this.showToast(`✅ Equipo creado exitosamente para ${this.solicitanteSeleccionadoParaEquipo.nombre}`);
        this.cerrarFormularioEquipo();
      },
      async (error) => {
        await loading.dismiss();
        console.error('Error al crear equipo:', error);

        let mensajeError = 'Error al crear el equipo';
        if (error.error?.error) {
          mensajeError = error.error.error;
        }

        this.showToast(mensajeError);
      }
    );
  }

  private marcarCamposEquipoComoSucios() {
    Object.keys(this.equipoIndividualForm.controls).forEach(key => {
      this.equipoIndividualForm.get(key)?.markAsTouched();
    });
    this.showToast('Por favor, completa los campos requeridos del equipo');
  }

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
    });
    await toast.present();
  }
}