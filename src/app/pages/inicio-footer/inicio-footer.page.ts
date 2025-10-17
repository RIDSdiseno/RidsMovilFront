import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-inicio-footer',
  templateUrl: './inicio-footer.page.html',
  styleUrls: ['./inicio-footer.page.scss'],
  standalone: false,
})
export class InicioFooterPage implements OnInit {
  private swipeCoord?: [number, number];
  private swipeTime?: number;

  // Variables para la creación del calendario
  currentTime: string = '';
  currentDate: string = '';
  weekDay: string = '';

  totalDaysThisMonth: number = 0;
  daysRemaining: number = 0;

  dayNames: string[] = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  calendarTitle: string = '';
  calendarWeeks: { date: number; isToday: boolean; otherMonth: boolean }[][] = [];

  currentCalendarDate: Date = new Date(); // Usado para navegar entre meses

  constructor(private router: Router) { }

  ngOnInit() {
    this.updateTime();
    setInterval(() => this.updateTime(), 1000);
    this.generateCalendar();
  }

  // ========== GESTOS TÁCTILES PARA CAMBIAR PÁGINAS ==========
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
        this.goToPreviousPage(); // Swipe derecho - Página anterior
      } else {
        this.goToNextPage(); // Swipe izquierdo - Página siguiente
      }
    }
  }

  goToNextPage() {
    const pageOrder = ['/inicio-footer', '/formulario-visitas', '/equipos', '/perfil'];
    const currentIndex = pageOrder.indexOf(this.router.url);

    if (currentIndex !== -1 && currentIndex < pageOrder.length - 1) {
      this.router.navigate([pageOrder[currentIndex + 1]]);
    } else {
      // Si es la última página, ir a la primera
      this.router.navigate([pageOrder[0]]);
    }
  }

  goToPreviousPage() {
    const pageOrder = ['/inicio-footer', '/formulario-visitas', '/equipos', '/perfil'];
    const currentIndex = pageOrder.indexOf(this.router.url);

    if (currentIndex !== -1 && currentIndex > 0) {
      this.router.navigate([pageOrder[currentIndex - 1]]);
    } else {
      // Si es la primera página, ir a la última
      this.router.navigate([pageOrder[pageOrder.length - 1]]);
    }
  }
  // ========== FIN GESTOS TÁCTILES ==========

  updateTime() {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('es-ES', { hour12: false });
    this.currentDate = now.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    this.weekDay = now.toLocaleDateString('es-ES', { weekday: 'long' });

    this.totalDaysThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    this.daysRemaining = this.totalDaysThisMonth - now.getDate();
  }

  // Método para generar el calendario del mes actual
  generateCalendar() {
    const now = this.currentCalendarDate;

    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const dayOfWeek = (firstDay.getDay() + 6) % 7; // lunes=0, domingo=6
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - dayOfWeek);

    const days = [];
    const today = new Date().toDateString();

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      days.push({
        date: date.getDate(),
        isToday: date.toDateString() === today,
        otherMonth: date.getMonth() !== now.getMonth(),
      });
    }

    this.calendarWeeks = [];
    for (let i = 0; i < 6; i++) {
      this.calendarWeeks.push(days.slice(i * 7, i * 7 + 7));
    }

    this.calendarTitle = `${now.toLocaleString('es-ES', { month: 'long' })} ${now.getFullYear()}`;
  }

  // Navegación entre meses previos
  previousMonth() {
    this.currentCalendarDate = new Date(
      this.currentCalendarDate.getFullYear(),
      this.currentCalendarDate.getMonth() - 1,
      1
    );
    this.generateCalendar();
  }

  // Navegación entre meses proximos
  nextMonth() {
    this.currentCalendarDate = new Date(
      this.currentCalendarDate.getFullYear(),
      this.currentCalendarDate.getMonth() + 1,
      1
    );
    this.generateCalendar();
  }
}