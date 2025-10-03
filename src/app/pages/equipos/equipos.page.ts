import { Component, OnInit } from '@angular/core';
import {
  AlertController,
  ToastController,
  LoadingController
} from '@ionic/angular';
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

  constructor(private api: ApiService) { }

  ngOnInit() {
    this.loadEquipment();
  }

  cancelEdit() {
    this.selectedEquipo = null;
  }

  selectEquipo(equipo: any) {
    // Clonamos el objeto para no modificar directamente la lista mientras se edita
    this.selectedEquipo = { ...equipo };
  }

  loadEquipment() {
    console.log('🔄 Solicitando datos de equipos a la API...');

    this.api.getEquipos().subscribe({
      next: (response) => {
        console.log('Respuesta cruda API:', response);

        if (response && response.equipos && Array.isArray(response.equipos)) {
          this.equipment = response.equipos;
        } else {
          console.warn('⚠️ Formato de respuesta inesperado.');
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
    console.log('Filtrando con término:', this.searchTerm);
    console.log('Datos disponibles:', this.equipment);

    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredEquipment = [...this.equipment];
      return;
    }

    this.filteredEquipment = this.equipment.filter(equipo =>
      equipo.serial?.toLowerCase().includes(term)
    );
  }

}