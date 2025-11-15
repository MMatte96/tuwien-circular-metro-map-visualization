import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CircularMetroMapComponent } from './circular-metro-map.component';

describe('CircularMetroMapComponent', () => {
  let component: CircularMetroMapComponent;
  let fixture: ComponentFixture<CircularMetroMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CircularMetroMapComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CircularMetroMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
