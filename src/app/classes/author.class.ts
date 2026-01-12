export class Author {
  constructor(
    public name: string,
    public id: number
  ) {
  }

  public toString(): string {
    return this.name;
  }
}
