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
  private swipeCoord?: [number, number];
  private swipeTime?: number;
  equipment: any[] = [];
  filteredEquipment: any[] = [];
  searchTerm: string = '';
  selectedEquipo: any = null;

  constructor(
    private api: ApiService,
    private router: Router,
    private cdRef: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.loadEquipment();
  }

  // Gestos táctiles para cambiar de página
  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    this.swipeCoord = [event.changedTouches[0].clientX, event.changedTouches[0].clientY];
    this.swipeTime = new Date().getTime();
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent) {
    if (!this.swipeCoord || !this.swipeTime) return;

    const coord: [number, number] = [event.changedTouches[0].clientX, event.changedTouches[0].clientY];
    const time = new Date().getTime();

    const direction = [coord[0] - this.swipeCoord[0], coord[1] - this.swipeCoord[1]];
    const duration = time - this.swipeTime;

    // Detectar swipe horizontal (más de 30px en X y menos en Y)
    if (duration < 1000 && Math.abs(direction[0]) > 30 && Math.abs(direction[0]) > Math.abs(direction[1] * 3)) {
      if (direction[0] > 0) {
        this.goToPreviousPage(); // Swipe derecho
      } else {
        this.goToNextPage(); // Swipe izquierdo
      }
    }
  }

  goToNextPage() {
    const currentUrl = this.router.url;
    const pageOrder = ['/inicio-footer', '/formulario-visitas', '/equipos', '/perfil'];
    const currentIndex = pageOrder.indexOf(currentUrl);

    if (currentIndex !== -1 && currentIndex < pageOrder.length - 1) {
      this.router.navigate([pageOrder[currentIndex + 1]]);
    } else {
      // Si es la última página, ir a la primera
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
      // Si es la primera página, ir a la última
      this.router.navigate([pageOrder[pageOrder.length - 1]]);
    }
  }

  // Métodos existentes de tu código
  cancelEdit() {
    this.selectedEquipo = null;
  }

  selectEquipo(equipo: any) {
    this.selectedEquipo = {
      ...equipo,
      _original: { ...equipo }
    };
    console.log(this.selectedEquipo);
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