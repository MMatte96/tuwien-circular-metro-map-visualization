import { Publication } from "../classes/publication.class";
import { IMetroLink } from "../interfaces/d3/metro-link.interface";
import { IMetroNode } from "../interfaces/d3/metro-node.interface";

export class SugiyamaService {
    private links: IMetroLink[];
    private nodes: IMetroNode[];
    private layers: Map<number, IMetroNode[]> = new Map();
    private virtualLayers: Map<number, IMetroNode[]> = new Map();
    private virtualLinks: IMetroLink[] = [];

    constructor(
        nodes: IMetroNode[],
        links: IMetroLink[]
    ) {
        this.nodes = nodes.map( n => ({ ...n }) );
        this.links = links.map( l => ({ ...l }) );
     } 

    public run(): IMetroNode[] {
        const nodes = this.nodes.map( n => ({ ...n }) );

        this.assignLayers();
        this.orderVertices();
        this.assignCoordinates();

        return nodes;
    }

    private assignLayers(): void {
        for ( const node of this.nodes ) {
            const layer = node.publication.year;
            if ( ! this.layers.has( node.publication.year ) ) {
                this.layers.set( node.publication.year, [ node ] );
            } else {
                this.layers.get( node.publication.year )!.push( node );
            }
        }
    }

    private orderVertices(): void {
        this.createVirtualNodesAndLinks();
        const layers = this.layers;
        const links = this.links;
        const best = [...layers.entries()]

        for ( let i = 0; i < 24; i++) {
            
        }
    }

    private createVirtualNodesAndLinks(): void {
        let virtualIndex = 0;
        const layerKeys = Array.from(this.layers.keys()).sort((a, b) => a - b);
        const nodeIdToLayerKey = new Map<number, number>();
        for (const k of layerKeys) {
            const layer = this.layers.get(k) ?? [];
            for (const n of layer) {
                nodeIdToLayerKey.set(n.publication.id, k);
            }
        }

        for ( let i = 0; i < layerKeys.length - 1; i++ ) {
            const currentLayerKey = layerKeys[i];
            const nextLayerKey = layerKeys[i + 1];
            const currentLayer = this.layers.get( currentLayerKey ) ?? [];
            const nextLayer = this.layers.get( nextLayerKey ) ?? [];

            for ( let node of currentLayer ) {
                const nodeLayerKey = nodeIdToLayerKey.get( node.publication.id )!;
                // get all Links that are outgoing from this node and skip those that go to the next layer
                const outgoingMulti = this.links.filter( 
                    l => 
                        l.source == node.publication.id &&
                        Math.abs( nodeIdToLayerKey.get( l.target )! - nodeLayerKey ) > 1 &&
                        nodeIdToLayerKey.get( l.target ) !== nextLayerKey
                );

                // For each outgoing link, create a virtual node in the next layer and connect it to the target of the original link. Connect the original node to the virtual node with a new link. Remove the original link.
                for ( const link of outgoingMulti ) {
                    const virtualId = -1 - virtualIndex++;
                    const virtualNode: IMetroNode = {
                        publication: { id: virtualId } as Publication,
                        angle: 0
                    }
                    nextLayer.push( virtualNode );
                    nodeIdToLayerKey.set( virtualId, nextLayerKey );
                    // remove original link
                    const idx = this.links.findIndex(
                        l => l.source === link.source && l.target === link.target && l.cluster === link.cluster
                    );
                    if (idx >= 0) this.links.splice(idx, 1);
                    // add new links
                    this.links.push({ source: link.source, target: virtualId, cluster: link.cluster });
                    this.links.push({ source: virtualId, target: link.target, cluster: link.cluster });
                }
            }
        }
    }

    private assignCoordinates(): void {

    }  
}