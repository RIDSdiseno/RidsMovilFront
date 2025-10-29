import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-inicio-footer',
  templateUrl: './inicio-footer.page.html',
  styleUrls: ['./inicio-footer.page.scss'],
  standalone: false,
})
export class InicioFooterPage implements OnInit {

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

    // AÑADIR: Calcular total de días del mes actual
    this.totalDaysThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    // Calcular días hasta el próximo día 5
    this.calculateDaysUntil5th();
  }

  private calculateDaysUntil5th(): void {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let targetMonth = currentMonth;
    let targetYear = currentYear;

    const quintoDiaHabilActual = this.getNthBusinessDay(currentYear, currentMonth, 5);

    if (today > quintoDiaHabilActual) {
      targetMonth += 1;
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear += 1;
      }
    }

    const nextQuintoHabil = this.getNthBusinessDay(targetYear, targetMonth, 5);

    const diffTime = nextQuintoHabil.getTime() - today.getTime();
    this.daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (this.daysRemaining < 0) this.daysRemaining = 0;

  }

  private getNthBusinessDay(year: number, month: number, n: number): Date {
    // 📆 Lista de feriados chilenos 2025 (formato YYYY-MM-DD)
    const feriados2025 = [
      '2025-01-01', // Año Nuevo
      '2025-04-18', // Viernes Santo
      '2025-04-19', // Sábado Santo
      '2025-05-01', // Día del Trabajador
      '2025-05-21', // Glorias Navales
      '2025-06-09', // Corpus Christi (móvil)
      '2025-06-29', // San Pedro y San Pablo
      '2025-07-16', // Virgen del Carmen
      '2025-08-15', // Asunción de la Virgen
      '2025-09-18', // Independencia Nacional
      '2025-09-19', // Glorias del Ejército
      '2025-10-12', // Encuentro de Dos Mundos
      '2025-10-31', // Día de las Iglesias Evangélicas
      '2025-11-01', // Todos los Santos
      '2025-12-08', // Inmaculada Concepción
      '2025-12-25', // Navidad
    ];

    let count = 0;
    const date = new Date(year, month, 1);

    while (true) {
      const day = date.getDay();
      const isoDate = date.toISOString().split('T')[0];

      const isFeriado = feriados2025.includes(isoDate);
      const esFinDeSemana = (day === 0 || day === 6); // Domingo=0, Sábado=6

      if (!esFinDeSemana && !isFeriado) {
        count++;
        if (count === n) {
          return new Date(date);
        }
      }

      date.setDate(date.getDate() + 1);
    }
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

  // Navegación entre meses próximos
  nextMonth() {
    this.currentCalendarDate = new Date(
      this.currentCalendarDate.getFullYear(),
      this.currentCalendarDate.getMonth() + 1,
      1
    );
    this.generateCalendar();
  }
}