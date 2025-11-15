import { Injectable } from '@angular/core';
import {Publication} from '../classes/publication.class';
import {Author} from '../classes/author.class';

@Injectable({
  providedIn: 'root'
})
export class PublicationService {

  constructor() { }

  public loadPublicationsFromFile(file: File): Promise<Publication[]> {
    return new Promise( ( resolve, reject ) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const rawJson = JSON.parse(reader.result as string);
          const publications = rawJson.map( (p: any) =>
            new Publication(
              p.id,
              p.clusters,
              p.title,
              p.authors.map( (a: any) => new Author( a.name, a.id) ),
              p.year,
              p.venue
            )
          );
          resolve(publications);
        } catch (e: unknown) {
          reject(e);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
    } );
  }
}
