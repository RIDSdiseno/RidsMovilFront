import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { InicioFooterPageRoutingModule } from './inicio-footer-routing.module';

import { InicioFooterPage } from './inicio-footer.page';
import { FooterMenuComponent } from 'src/app/components/footer-menu/footer-menu.component';
import { SharedModule } from 'src/app/shared/shared-module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    InicioFooterPageRoutingModule,
    SharedModule
  ],
  declarations: [InicioFooterPage,],
})
export class InicioFooterPageModule {}
