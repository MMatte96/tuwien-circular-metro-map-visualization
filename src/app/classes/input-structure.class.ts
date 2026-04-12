import { IMetroLine } from "../interfaces/d3/metro-line.interface";
import { Publication } from "./publication.class";

export class InputStructure {
    public publications: Publication[] = [];
    public clusters: IMetroLine[] = [];

    constructor( publications: Publication[], clusters: IMetroLine[] ) {
        this.publications = publications;
        this.clusters = clusters;
    }
}