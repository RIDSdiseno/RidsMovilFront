import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { EntregaProductosPage } from './entrega-productos.page';

describe('EntregaProductosPage', () => {
  let component: EntregaProductosPage;
  let fixture: ComponentFixture<EntregaProductosPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EntregaProductosPage],
      imports: [IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(EntregaProductosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

