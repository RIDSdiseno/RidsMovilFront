import { CommonModule, DatePipe, registerLocaleData } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from 'src/app/services/api';
import localeEsCl from '@angular/common/locales/es-CL';
import { AlertController } from '@ionic/angular';

registerLocaleData(localeEsCl, 'es-CL');

enum EstadoVisita {
  SIN_INICIAR = 'Sin iniciar',
  EN_CURSO = 'En curso',
  COMPLETADA = 'Completada'
}

@Component({
  selector: 'app-formulario-visitas',
  templateUrl: './formulario-visitas.page.html',
  styleUrls: ['./formulario-visitas.page.scss'],
  standalone: false,
})
export class FormularioVisitasPage implements OnInit {
  visitaForm: FormGroup;
  visitas: any[] = [];
  clientes: any[] = [];

  inicio: Date | null = null;
  fin: Date | null = null;
  estado: EstadoVisita = EstadoVisita.SIN_INICIAR;
  estadoTexto: string = 'Listo para iniciar una visita.';
  visitaEnCurso = false;
  username: string = '';

  constructor(
    private fb: FormBuilder,
    private datePipe: DatePipe,
    private api: ApiService,
    private router: Router,
    private alertController: AlertController
  ) {
    this.visitaForm = this.fb.group({
      cliente: ['', Validators.required],
      solicitante: ['', Validators.required],
      actividades: this.fb.group({
        impresoras: [false],
        telefonos: [false],
        pie: [false],
        otros: [false],
      }),
      otrosDetalle: [''],
      realizado: ['', [Validators.required, this.minWordsValidator(2, 10)]],
    });
  }

  ngOnInit() {
    this.username = (localStorage.getItem('username') || '').toLowerCase();
    this.api.getClientes().subscribe(
      (data) => this.clientes = data,
      (error) => console.error('Error al cargar clientes', error)
    );

    this.setupOtrosDetalleValidation();
    this.visitaForm.disable(); // Deshabilitado por defecto
  }

  iniciarVisita() {
    this.inicio = new Date();
    this.visitaEnCurso = true;
    this.fin = null;
    this.estado = EstadoVisita.EN_CURSO;
    this.estadoTexto = 'La visita está en curso.';
    this.visitaForm.enable();
  }

  async terminarVisita() {
    // Marca todos los campos como tocados para activar validaciones en la UI
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

    this.fin = new Date();
    this.visitaEnCurso = false;
    this.estado = EstadoVisita.COMPLETADA;
    this.estadoTexto = 'La visita ha sido registrada.';
    this.visitaForm.disable();

    this.guardarVisita();
  }

  resetFormulario() {
    this.visitaForm.reset();
    this.visitaForm.disable();
    this.inicio = null;
    this.fin = null;
    this.visitaEnCurso = false;
    this.estado = EstadoVisita.SIN_INICIAR;
    this.estadoTexto = 'Listo para iniciar una visita.';
  }

  guardarVisita() {
    const formValue = this.visitaForm.value;

    const visitaData = {
      cliente: formValue.cliente,
      solicitante: formValue.solicitante,
      ...formValue.actividades,
      otrosDetalle: formValue.otrosDetalle,
      realizado: formValue.realizado,
      inicio: this.formatFecha(this.inicio),
      fin: this.formatFecha(this.fin),
      username: this.username
    };

    this.visitas.push(visitaData);

    const allHistorial = JSON.parse(localStorage.getItem('visitas_registro') || '{}') as Record<string, any[]>;
    allHistorial[this.username] = this.visitas;
    localStorage.setItem('visitas_registro', JSON.stringify(allHistorial));
  }

  private formatFecha(fecha: Date | null): string | null {
    return fecha ? this.datePipe.transform(fecha, 'dd/MM/yyyy HH:mm', '', 'es-CL') : null;
  }

  private minWordsValidator(minWords: number, minChars: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value || typeof control.value !== 'string') {
        return { minWordsOrChars: true };
      }
      const wordCount = control.value.trim().split(/\s+/).filter(w => w.length > 0).length;
      const charCount = control.value.trim().length;
      return (wordCount < minWords && charCount < minChars) ? { minWordsOrChars: true } : null;
    };
  }

  private setupOtrosDetalleValidation() {
    this.visitaForm.get('actividades.otros')?.valueChanges.subscribe((isChecked: boolean) => {
      const otrosDetalle = this.visitaForm.get('otrosDetalle');
      if (isChecked) {
        otrosDetalle?.setValidators([Validators.required]);
      } else {
        otrosDetalle?.clearValidators();
        otrosDetalle?.setValue('');
      }
      otrosDetalle?.updateValueAndValidity();
    });
  }
}
