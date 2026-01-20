import { ChangeDetectorRef, Component, OnInit, HostListener } from '@angular/core';
import { ApiService } from '../../services/api';
import { Router } from '@angular/router';

@Component({
  selector: 'app-equipos',
  templateUrl: './equipos.page.html',
  styleUrls: ['./equipos.page.scss'],
  standalone: false
})
export class EquiposPage implements OnInit {
  equipment: any[] = [];
  filteredEquipment: any[] = [];
  searchTerm: string = '';
  selectedEquipo: any = null;

  solicitantesEmpresa: any[] = [];

  solicitantesFiltrados: any[] = [];

  constructor(
    private api: ApiService,
    private router: Router,
    private cdRef: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.loadEquipment();
  }

  filtrarSolicitantes(ev: any) {
    const value = ev.target.value?.toLowerCase() || '';

    this.solicitantesFiltrados = this.solicitantesEmpresa.filter(s =>
      s.nombre.toLowerCase().includes(value)
    );
  }

  // Métodos existentes de tu código
  cancelEdit() {
    this.selectedEquipo = null;
    this.solicitantesEmpresa = [];
    this.solicitantesFiltrados = [];
  }

  cambiarSolicitante() {
    if (!this.selectedEquipo) return;

    const nuevoSolicitante = this.selectedEquipo.idSolicitante;
    const originalSolicitante = this.selectedEquipo._original.idSolicitante;

    if (!nuevoSolicitante) {
      console.warn('Debe seleccionar un solicitante');
      return;
    }

    if (nuevoSolicitante === originalSolicitante) {
      console.warn('El solicitante no cambió');
      return;
    }

    this.api.cambiarSolicitanteEquipo(
      this.selectedEquipo.id_equipo,
      nuevoSolicitante
    ).subscribe({
      next: () => {
        this.selectedEquipo._original.idSolicitante = nuevoSolicitante;

        const eq = this.equipment.find(
          e => e.id_equipo === this.selectedEquipo.id_equipo
        );
        if (eq) eq.idSolicitante = nuevoSolicitante;

        console.log('Solicitante actualizado correctamente');
      },
      error: (err: any) => {
        console.error('Error al cambiar solicitante', err);
      }
    });
  }

  cargarSolicitantesEmpresa(empresaId: number) {
    this.api.getSolicitantes(empresaId).subscribe({
      next: (res) => {
        this.solicitantesEmpresa = res.solicitantes || [];
        this.solicitantesFiltrados = [...this.solicitantesEmpresa]; // 👈 CLAVE
      },
      error: (err) => {
        console.error('Error cargando solicitantes', err);
        this.solicitantesEmpresa = [];
        this.solicitantesFiltrados = [];
      }
    });
  }

  selectEquipo(equipo: any) {
    console.log('Equipo recibido:', equipo);
    this.selectedEquipo = {
      ...equipo,
      idSolicitante: equipo.idSolicitante ?? null,
      _original: {
        ...equipo,
        idSolicitante: equipo.idSolicitante ?? null
      }
    };

    if (equipo.empresaId) {
      this.cargarSolicitantesEmpresa(equipo.empresaId);
    }
  }

  loadEquipment() {
    console.log('Solicitando datos de equipos a la API...');
    const startTime = Date.now();

    this.api.getEquipos().subscribe({
      next: (response) => {
        /*
        console.log('Respuesta cruda API:', response);
*/
        if (response && response.equipos && Array.isArray(response.equipos)) {
          this.equipment = response.equipos;
        } else {
          console.warn('Formato de respuesta inesperado.');
          this.equipment = [];
        }

        this.filteredEquipment = [...this.equipment];
        /*
        console.log('Total equipos:', this.equipment.length);
        */
        const endTime = Date.now();
        /*
        console.log(` TIEMPO DE CARGA: ${endTime - startTime}ms`);
*/
      },
      error: (error) => {
        console.error('Error al cargar equipos:', error);
      }
    });
  }

  filterEquipment() {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredEquipment = [...this.equipment];
      return;
    }

    this.filteredEquipment = this.equipment.filter(equipo =>
      equipo.serial?.toLowerCase().includes(term)
    );
  }

  guardarCambios() {
    if (!this.selectedEquipo || !this.selectedEquipo.id_equipo) {
      console.warn('No hay equipo seleccionado');
      return;
    }

    const id = this.selectedEquipo.id_equipo;
    const original = this.selectedEquipo._original || {};

    const trim = (v: any) =>
      v === null || v === undefined ? '' : String(v).trim();

    const disco = trim(this.selectedEquipo.disco);
    const procesador = trim(this.selectedEquipo.procesador);
    const ram = trim(this.selectedEquipo.ram);
    const tipoDd = trim(this.selectedEquipo.tipoDd);

    const payload: any = {};
    if (disco !== trim(original.disco)) payload.disco = disco;
    if (procesador !== trim(original.procesador)) payload.procesador = procesador;
    if (ram !== trim(original.ram)) payload.ram = ram;
    if (tipoDd !== trim(original.tipoDd)) payload.tipoDd = tipoDd;

    if (Object.keys(payload).length === 0) {
      console.warn('No hay cambios para guardar');
      this.cancelEdit();
      return;
    }

    this.api.actualizarEquipo(id, payload).subscribe({
      next: (response) => {
        console.log('Equipo Actualizado', response);

        const idx = this.equipment.findIndex(eq => eq.id_equipo === id);
        if (idx !== -1) {
          this.equipment[idx] = { ...this.equipment[idx], ...payload };
        }

        this.filteredEquipment = this.filteredEquipment.map(eq =>
          eq.id_equipo === id ? { ...eq, ...payload } : eq
        );

        this.cancelEdit();
      },
      error: (err) => {
        console.error('Error al guardar cambios:', err);
      }
    });
  }
}