import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CircularMetroMapComponent } from './components/d3/circular-metro-map/circular-metro-map.component';
import { MetroMapLegendComponent } from './components/d3/metro-map-legend/metro-map-legend.component';

@NgModule({
  declarations: [
    AppComponent,
    CircularMetroMapComponent,
    MetroMapLegendComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
