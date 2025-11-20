import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastController, LoadingController } from '@ionic/angular';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiService } from 'src/app/services/api';

@Component({
  selector: 'app-agregar-usuario',
  templateUrl: './agregar-usuario.page.html',
  styleUrls: ['./agregar-usuario.page.scss'],
  standalone: false,
})
export class AgregarUsuarioPage implements OnInit, OnDestroy {
  usuarioForm: FormGroup;
  clientes: any[] = [];

  // Estados de carga
  cargandoClientes = false;
  sincronizando = false;

  resultadoSync: any = null;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {
    this.usuarioForm = this.fb.group({
      cliente: ['', Validators.required],  // id_empresa
      domain: ['', Validators.required],   // dominio (colegio.cl)
      email: ['', []],                     // opcional para 1 solo usuario
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
    this.cargandoClientes = true;
    this.api.getClientes().pipe(takeUntil(this.destroy$)).subscribe(
      (data) => {
        this.clientes = data;
        this.cargandoClientes = false;
      },
      (error) => {
        console.error('Error al cargar clientes:', error);
        this.showToast('Error al cargar los clientes');
        this.cargandoClientes = false;
      }
    );
  }

  /* ===================== SYNC GOOGLE ===================== */

  async syncGoogle() {
    if (this.usuarioForm.get('cliente')?.invalid || this.usuarioForm.get('domain')?.invalid) {
      this.usuarioForm.get('cliente')?.markAsTouched();
      this.usuarioForm.get('domain')?.markAsTouched();
      this.showToast('Selecciona un cliente y un dominio');
      return;
    }

    const empresaId = this.usuarioForm.get('cliente')?.value;
    const domain = (this.usuarioForm.get('domain')?.value || '').trim();
    const email = (this.usuarioForm.get('email')?.value || '').trim();

    if (!domain) {
      this.showToast('El dominio es requerido');
      return;
    }

    const loading = await this.loadingController.create({
      message: email
        ? 'Sincronizando usuario desde Google Workspace...'
        : 'Sincronizando todos los usuarios de Google Workspace...',
    });
    await loading.present();

    this.sincronizando = true;
    this.resultadoSync = null;

    const obs$ = email
      ? this.api.syncGoogleUser({ domain, empresaId, email })
      : this.api.syncGoogleAll({ domain, empresaId });

    obs$.pipe(takeUntil(this.destroy$)).subscribe({
      next: async (res: any) => {
        await loading.dismiss();
        this.sincronizando = false;
        this.resultadoSync = {
          origen: 'Google Workspace',
          ...res,
        };
        this.showToast('Sincronización Google finalizada');
      },
      error: async (err) => {
        await loading.dismiss();
        this.sincronizando = false;
        console.error('Error al sincronizar Google:', err);
        const msg = err?.error?.error || 'Error al sincronizar usuarios de Google';
        this.showToast(msg);
      },
    });
  }

  /* ===================== SYNC MICROSOFT ===================== */

  async syncMicrosoft() {
    if (this.usuarioForm.get('cliente')?.invalid) {
      this.usuarioForm.get('cliente')?.markAsTouched();
      this.showToast('Selecciona un cliente');
      return;
    }

    const empresaId = this.usuarioForm.get('cliente')?.value;
    const domain = (this.usuarioForm.get('domain')?.value || '').trim();
    const email = (this.usuarioForm.get('email')?.value || '').trim();

    const loading = await this.loadingController.create({
      message: email
        ? 'Sincronizando usuario desde Microsoft 365...'
        : 'Sincronizando todos los usuarios de Microsoft 365...',
    });
    await loading.present();

    this.sincronizando = true;
    this.resultadoSync = null;

    const payloadBase: any = { empresaId };
    if (domain) payloadBase.domain = domain;

    const obs$ = email
      ? this.api.syncMicrosoftUser({ ...payloadBase, email })
      : this.api.syncMicrosoftAll({ ...payloadBase, concurrency: 8, chunkSize: 200 });

    obs$.pipe(takeUntil(this.destroy$)).subscribe({
      next: async (res: any) => {
        await loading.dismiss();
        this.sincronizando = false;
        this.resultadoSync = {
          origen: 'Microsoft 365',
          ...res,
        };
        this.showToast('Sincronización Microsoft finalizada');
      },
      error: async (err) => {
        await loading.dismiss();
        this.sincronizando = false;
        console.error('Error al sincronizar Microsoft:', err);
        const msg = err?.error?.error || 'Error al sincronizar usuarios de Microsoft';
        this.showToast(msg);
      },
    });
  }

  /* ===================== Helpers ===================== */

  getClienteSeleccionadoNombre(): string {
    const clienteId = this.usuarioForm.get('cliente')?.value;
    const cliente = this.clientes.find((c) => c.id_empresa === clienteId);
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

  // Validación simple de email (opcional)
  validarEmail(): boolean {
    const email = this.usuarioForm.get('email')?.value;
    if (email && email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    }
    return true; // vacío es válido, es opcional
  }
}
