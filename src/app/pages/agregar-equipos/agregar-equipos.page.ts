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

  // NUEVA VARIABLE: Para almacenar el nombre de la empresa seleccionada
  empresaSeleccionadaNombre: string = '';

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
      propiedad: [''] // Este campo se auto-completará
    });
  }

  ngOnInit() {
    this.cargarClientes();

    this.equipoForm.get('cliente')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe((clienteId) => {
      if (clienteId) {
        this.cargarSolicitantes(clienteId);
        // NUEVO: Actualizar el nombre de la empresa cuando se selecciona
        this.actualizarNombreEmpresa(clienteId);
      } else {
        this.limpiarSolicitantes();
        this.empresaSeleccionadaNombre = ''; // Limpiar cuando no hay selección
      }
    });

    this.equipoForm.get('busquedaSolicitante')?.valueChanges.pipe(
      takeUntil(this.destroy$),
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(term => this.filtrarSolicitantes(term));
  }

  // NUEVO MÉTODO: Obtener el nombre de la empresa seleccionada
  actualizarNombreEmpresa(clienteId: string) {
    const empresa = this.clientes.find(c => c.id_empresa === Number(clienteId));
    this.empresaSeleccionadaNombre = empresa ? empresa.nombre : '';

    // Si el formulario de equipo está abierto, actualizar el campo propiedad
    if (this.mostrarFormularioEquipo && this.empresaSeleccionadaNombre) {
      this.equipoIndividualForm.patchValue({
        propiedad: this.empresaSeleccionadaNombre
      });
    }
  }

  // NUEVO MÉTODO: Obtener nombre de empresa para mostrar
  getEmpresaSeleccionadaNombre(): string {
    return this.empresaSeleccionadaNombre || 'No seleccionada';
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
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

    // NUEVO: Auto-completar el campo propiedad con el nombre de la empresa
    if (this.empresaSeleccionadaNombre) {
      this.equipoIndividualForm.patchValue({
        propiedad: this.empresaSeleccionadaNombre
      });
    }
  }

  abrirListaSolicitantes() {
    if (!this.equipoForm.get('cliente')?.value) {
      this.showToast('Selecciona una empresa antes de elegir solicitantes.');
      return;
    }
    this.mostrarListaSolicitantes = true;
  }

  cerrarFormularioEquipo() {
    this.mostrarFormularioEquipo = false;
    this.solicitanteSeleccionadoParaEquipo = null;
    this.equipoIndividualForm.reset();
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

    // NUEVO: Asegurar que el campo propiedad tenga el nombre de la empresa
    const equipoData = {
      idSolicitante: this.solicitanteSeleccionadoParaEquipo.id_solicitante,
      ...this.equipoIndividualForm.value,
      propiedad: this.empresaSeleccionadaNombre // Forzar el valor correcto
    };

    this.api.crearEquipo(equipoData).subscribe(
      async (response: any) => {
        await loading.dismiss();
        this.showToast(`Equipo creado exitosamente para ${this.solicitanteSeleccionadoParaEquipo.nombre}`);
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