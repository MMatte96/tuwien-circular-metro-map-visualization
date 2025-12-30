import {Author} from './author.class';

export class Publication {
  constructor(
    public id: number,
    public clusters: number[],
    public title: string,
    public authors: Author[],
    public year: number,
    public venue: string
  ) {
  }

  public printAuthors(): string {
    return this.authors.map( a => a.name).join(', ');
  }
}
