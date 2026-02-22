import { Injectable } from '@angular/core';
import {Publication} from '../classes/publication.class';
import {Author} from '../classes/author.class';
import { InputStructure } from '../classes/input-structure.class';

@Injectable({
  providedIn: 'root'
})
export class PublicationService {

  constructor() { }

  public loadPublicationsFromFile(file: File): Promise<InputStructure> {
    return new Promise( ( resolve, reject ) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const inputStructure = JSON.parse(reader.result as string) as InputStructure;
          resolve(inputStructure);
        } catch (e: unknown) {
          reject(e);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
    } );
  }
}
