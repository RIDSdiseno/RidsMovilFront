import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-inicio-footer',
  templateUrl: './inicio-footer.page.html',
  styleUrls: ['./inicio-footer.page.scss'],
  standalone: false,
})
export class InicioFooterPage implements OnInit {
  currentTime: string = '';
  currentDate: string = '';
  weekDay: string = '';

  totalDaysThisMonth: number = 0;
  daysRemaining: number = 0;

  dayNames: string[] = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  calendarTitle: string = '';
  calendarWeeks: { date: number; isToday: boolean; otherMonth: boolean }[][] = [];

  currentCalendarDate: Date = new Date(); // Usado para navegar entre meses

  constructor() { }

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

    this.totalDaysThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    this.daysRemaining = this.totalDaysThisMonth - now.getDate();
  }

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

  previousMonth() {
    this.currentCalendarDate = new Date(
      this.currentCalendarDate.getFullYear(),
      this.currentCalendarDate.getMonth() - 1,
      1
    );
    this.generateCalendar();
  }

  nextMonth() {
    this.currentCalendarDate = new Date(
      this.currentCalendarDate.getFullYear(),
      this.currentCalendarDate.getMonth() + 1,
      1
    );
    this.generateCalendar();
  }
}
