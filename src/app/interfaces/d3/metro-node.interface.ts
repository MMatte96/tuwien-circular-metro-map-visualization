import * as d3 from 'd3'
import {Publication} from '../../classes/publication.class';
export interface IMetroNode extends d3.SimulationNodeDatum {
  publication: Publication;
  angle: number;
  radius?: number;
  layer?: number;
}
