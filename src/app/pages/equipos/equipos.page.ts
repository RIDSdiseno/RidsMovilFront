import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api';

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
  selectedEquipo: any = null; // { ...equipo, _original: {...equipo} }

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadEquipment();
  }

  cancelEdit() {
    this.selectedEquipo = null;
  }

  selectEquipo(equipo: any) {
    // Clonamos y guardamos copia original para comparar cambios
    this.selectedEquipo = {
      ...equipo,
      _original: { ...equipo } // guarda el original completo
    };
  }

  loadEquipment() {
    console.log('Solicitando datos de equipos a la API...');

    this.api.getEquipos().subscribe({
      next: (response) => {
        console.log('Respuesta cruda API:', response);

        if (response && response.equipos && Array.isArray(response.equipos)) {
          this.equipment = response.equipos;
        } else {
          console.warn('Formato de respuesta inesperado.');
          this.equipment = [];
        }

        this.filteredEquipment = [...this.equipment];
        console.log('Total equipos:', this.equipment.length);
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

    // Normaliza strings (trim). Si quieres evitar guardar vacío, puedes no incluirlos si quedan "".
    const trim = (v: any) =>
      v === null || v === undefined ? '' : String(v).trim();

    const disco = trim(this.selectedEquipo.disco);
    const procesador = trim(this.selectedEquipo.procesador);
    const ram = trim(this.selectedEquipo.ram);

    const payload: any = {};
    if (disco !== trim(original.disco)) payload.disco = disco;
    if (procesador !== trim(original.procesador)) payload.procesador = procesador;
    if (ram !== trim(original.ram)) payload.ram = ram;

    // Si no hay cambios, salir
    if (Object.keys(payload).length === 0) {
      console.warn('No hay cambios para guardar');
      this.cancelEdit();
      return;
    }

    this.api.actualizarEquipo(id, payload).subscribe({
      next: (response) => {
        console.log('Equipo Actualizado', response);

        // Actualizar lista local por id_equipo
        const idx = this.equipment.findIndex(eq => eq.id_equipo === id);
        if (idx !== -1) {
          this.equipment[idx] = { ...this.equipment[idx], ...payload };
        }

        // Refrescar la lista filtrada (para que se refleje en UI)
        this.filteredEquipment = this.filteredEquipment.map(eq =>
          eq.id_equipo === id ? { ...eq, ...payload } : eq
        );

        this.cancelEdit(); // Cierra panel de edición
      },
      error: (err) => {
        console.error('Error al guardar cambios:', err);
      }
    });
  }
}
