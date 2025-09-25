import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-footer-menu',
  templateUrl: './footer-menu.component.html',
  styleUrls: ['./footer-menu.component.scss'],
  standalone: false,
})
export class FooterMenuComponent  implements OnInit {

  constructor(private router: Router) { }


  goTo(path: string) {
    this.router.navigateByUrl(path);
  }

  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    this.router.navigate(['/home']);
  }

  ngOnInit() {}

}
