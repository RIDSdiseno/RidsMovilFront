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

    let targetMonth: number;
    let targetYear: number;

    if (currentDay <= 5) {
      // Usar el mes actual
      targetMonth = currentMonth;
      targetYear = currentYear;
    } else {
      // Usar el próximo mes
      targetMonth = currentMonth + 1;
      targetYear = currentYear;

      // Si es diciembre, avanzar al próximo año
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear = currentYear + 1;
      }
    }

    const nextPayment = new Date(targetYear, targetMonth, 5);
    const diffTime = nextPayment.getTime() - today.getTime();
    this.daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Asegurarse de que no sea negativo
    if (this.daysRemaining < 0) {
      this.daysRemaining = 0;
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