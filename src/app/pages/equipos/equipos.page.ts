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
  selectedEquipo: any = null;

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    this.loadEquipment();
  }

  cancelEdit() {
    this.selectedEquipo = null;
  }

  selectEquipo(equipo: any) {
    // Clonamos el objeto para no modificar directamente la lista mientras se edita
    this.selectedEquipo = {
      ...equipo,
      id: equipo.id_equipo
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
    if (!this.selectedEquipo || !this.selectedEquipo.id) {
      console.warn('No hay equipo seleccionado');
      return;
    }

    const payload = {
      disco: this.selectedEquipo.disco,
      procesador: this.selectedEquipo.procesador,
      ram: this.selectedEquipo.ram
    };

    this.api.actualizarEquipo(this.selectedEquipo.id, payload).subscribe({
      next: (response) => {
        console.log('Equipo Actualizado', response);

        // Actualizar lista local
        const index = this.equipment.findIndex(eq => eq.id === this.selectedEquipo.id);
        if (index !== -1) {
          // this.equipment[index] = { ...this.equipment[index], ...payload };
          // this.filteredEquipment = [...this.equipment]; // Actualiza vista filtrada
          this.equipment = [
            ...this.equipment.slice(0, index),
            response.equipo, // ← datos frescos del backend
            ...this.equipment.slice(index + 1)
          ];
          this.filteredEquipment = [...this.equipment];


          console.log('Lista de equipos actualizada:', this.equipment);

          this.cdr.detectChanges();
        }

        this.cancelEdit(); // Cierra panel de edición
      },
      error: (err) => {
        console.error('Error al guardar cambios:', err);
      }
    });
  }

}