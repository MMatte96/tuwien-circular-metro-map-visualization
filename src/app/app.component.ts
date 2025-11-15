import { Component } from '@angular/core';
import {Publication} from './classes/publication.class';
import {Author} from './classes/author.class';
import {PublicationService} from './services/publication.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
  styleUrl: './app.component.scss'
})
export class AppComponent {

  private selectedFileList : FileList | null = null;
  protected publications: Publication[] = [];

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
    this.publications = await this.publicationService.loadPublicationsFromFile(file)
    console.log(this.publications)
  }
}
