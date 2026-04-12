import { Component } from '@angular/core';
import {Publication} from './classes/publication.class';
import {Author} from './classes/author.class';
import {PublicationService} from './services/publication.service';
import { IMetroLine } from './interfaces/d3/metro-line.interface';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
  styleUrl: './app.component.scss'
})
export class AppComponent {

  private selectedFileList : FileList | null = null;
  protected publications: Publication[] = [];
  protected clusterDefinitions: IMetroLine[] = [];

  constructor(
    private publicationService: PublicationService
  ) {
  }

  protected changeFile(event: Event): void {
    this.selectedFileList = (event.target as HTMLInputElement).files;
  }

  protected async onUpload(): Promise<void> {
    if( !this.selectedFileList || this.selectedFileList.length === 0 ) return;
    const file = this.selectedFileList[0];
    const inputStructure = await this.publicationService.loadPublicationsFromFile(file);
    this.publications = inputStructure.publications;
    this.clusterDefinitions = inputStructure.clusters;
    console.log(this.publications)
  }
}
