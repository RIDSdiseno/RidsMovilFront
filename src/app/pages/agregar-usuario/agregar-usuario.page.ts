import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastController, LoadingController } from '@ionic/angular';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ApiService } from 'src/app/services/api';
import { Router } from '@angular/router';

@Component({
  selector: 'app-agregar-usuario',
  templateUrl: './agregar-usuario.page.html',
  styleUrls: ['./agregar-usuario.page.scss'],
  standalone: false,
})
export class AgregarUsuarioPage implements OnInit, OnDestroy {
  usuarioForm: FormGroup;
  clientes: any[] = []; // ← CAMBIÉ empresas por clientes
  mostrarFormularioUsuario = false;

  // Estados de carga
  cargandoClientes = false; // ← CAMBIÉ cargandoEmpresas por cargandoClientes

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private router: Router,
  ) {
    this.usuarioForm = this.fb.group({
      cliente: ['', Validators.required], // ← Este control se llama 'cliente'
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.email]],
      telefono: [''],
      clienteId: ['']
    });
  }

  ngOnInit() {
    this.cargarClientes();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarClientes() {
    this.cargandoClientes = true; // ← CAMBIÉ cargandoEmpresas por cargandoClientes
    this.api.getClientes().subscribe(
      (data) => {
        this.clientes = data; // ← CORREGIDO: ahora sí existe this.clientes
        this.cargandoClientes = false;
      },
      (error) => {
        console.error('Error al cargar clientes:', error);
        this.showToast('Error al cargar los clientes');
        this.cargandoClientes = false;
      }
    );
  }

  abrirFormularioUsuario() {
    const cliente = this.usuarioForm.get('cliente')?.value; // ← CAMBIÉ empresa por cliente
    if (!cliente) {
      this.showToast('Primero selecciona un cliente');
      return;
    }

    this.mostrarFormularioUsuario = true;

    // Resetear solo los campos de usuario, manteniendo el cliente seleccionado
    this.usuarioForm.patchValue({
      nombre: '',
      email: '',
      telefono: '',
      clienteId: ''
    });
  }

  cerrarFormularioUsuario() {
    this.mostrarFormularioUsuario = false;
    // Mantener el cliente seleccionado pero limpiar los demás campos
    const clienteSeleccionado = this.usuarioForm.get('cliente')?.value; // ← CAMBIÉ empresa por cliente
    this.usuarioForm.reset({ cliente: clienteSeleccionado });
  }

  async crearUsuario() {
    if (this.usuarioForm.invalid) {
      this.marcarCamposUsuarioComoSucios();
      return;
    }

    const clienteId = this.usuarioForm.get('cliente')?.value; // ← CAMBIÉ empresa por cliente
    if (!clienteId) {
      this.showToast('Debe seleccionar un cliente');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Creando usuario...',
    });
    await loading.present();

    const usuarioData = {
      empresaId: clienteId, // ← En el backend sigue siendo empresaId, pero en frontend es cliente
      nombre: this.usuarioForm.get('nombre')?.value,
      email: this.usuarioForm.get('email')?.value || undefined,
      telefono: this.usuarioForm.get('telefono')?.value || undefined,
      clienteId: this.usuarioForm.get('clienteId')?.value || undefined
    };

    this.api.crearUsuario(usuarioData).subscribe(
      async (response: any) => {
        await loading.dismiss();
        this.showToast(`Usuario creado exitosamente`);
        this.cerrarFormularioUsuario();
      },
      async (error) => {
        await loading.dismiss();
        console.error('Error al crear usuario:', error);

        let mensajeError = 'Error al crear el usuario';
        if (error.error?.error) {
          mensajeError = error.error.error;
        } else if (error.status === 400) {
          mensajeError = error.error?.error || 'Datos inválidos';
        } else if (error.status === 500) {
          mensajeError = 'Error interno del servidor';
        }

        this.showToast(mensajeError);
      }
    );
  }

  private marcarCamposUsuarioComoSucios() {
    Object.keys(this.usuarioForm.controls).forEach(key => {
      if (key !== 'cliente') { // ← CAMBIÉ empresa por cliente
        this.usuarioForm.get(key)?.markAsTouched();
      }
    });
    this.showToast('Por favor, completa los campos requeridos');
  }

  getClienteSeleccionadoNombre(): string { // ← CAMBIÉ getEmpresaSeleccionadaNombre por getClienteSeleccionadoNombre
    const clienteId = this.usuarioForm.get('cliente')?.value; // ← CAMBIÉ empresa por cliente
    const cliente = this.clientes.find(c => c.id_empresa === clienteId); // ← CAMBIÉ empresas por clientes
    return cliente ? cliente.nombre : 'Selecciona un cliente';
  }

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
    });
    await toast.present();
  }

  // Validación en tiempo real para email
  validarEmail(): boolean {
    const email = this.usuarioForm.get('email')?.value;
    if (email && email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    }
    return true; // Email vacío es válido (es opcional)
  }

  // HostListener para cerrar con escape key
  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.mostrarFormularioUsuario) {
      this.cerrarFormularioUsuario();
    }
  }
}