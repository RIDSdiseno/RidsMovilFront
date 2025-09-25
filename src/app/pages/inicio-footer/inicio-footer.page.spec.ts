import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InicioFooterPage } from './inicio-footer.page';

describe('InicioFooterPage', () => {
  let component: InicioFooterPage;
  let fixture: ComponentFixture<InicioFooterPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(InicioFooterPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
