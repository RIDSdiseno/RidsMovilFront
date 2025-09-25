import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-footer-menu',
  templateUrl: './footer-menu.component.html',
  styleUrls: ['./footer-menu.component.scss'],
  standalone: true,
  imports: [IonicModule]   // 👈 esto es suficiente para usar <ion-label>, <ion-icon>, etc.
})
export class FooterMenuComponent {
  constructor(private router: Router) { }

  goTo(path: string) {
    this.router.navigateByUrl(path);
  }

  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    this.router.navigate(['/home']);
  }
}
