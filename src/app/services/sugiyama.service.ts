import { Publication } from "../classes/publication.class";
import { IMetroLink } from "../interfaces/d3/metro-link.interface";
import { IMetroNode } from "../interfaces/d3/metro-node.interface";

export class SugiyamaService {
    private links: IMetroLink[];
    private nodes: IMetroNode[];
    private layers: Map<number, IMetroNode[]> = new Map();
    private bestLayers: Map<number, IMetroNode[]> = new Map();

    constructor(
        nodes: IMetroNode[],
        links: IMetroLink[]
    ) {
        this.nodes = nodes.map( n => ({ ...n }) );
        this.links = links.map( l => ({ ...l }) );
     } 

    public run(): IMetroNode[] {
        this.assignLayers();
        this.orderVertices();
        this.assignCoordinates();

        return this.nodes;
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

    // Virtual nodes are introduced for multi-layer spanning edges, to satisfy Sugiyama's prerequisite of edges only spanning adjacent layers. 
    // They are placed in the next layer and connected to the original target with a new link. The original link is removed and replaced with a link from the source to the virtual node.
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
                const nextLayerKeyIndex = layerKeys.indexOf( nextLayerKey );
                // get all Links that are outgoing from this node and skip those that go to the next layer
                const outgoingMulti = this.links.filter( 
                    l => 
                        l.source == node.publication.id &&
                        layerKeys.indexOf( nodeIdToLayerKey.get( l.target )! ) !== nextLayerKeyIndex &&
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

    // Count the number of edge crossings in the given layout
    // Prerequisite: directed links only go from layer i to layer i+1, no intra-layer links, not multi-layer spanning links
    private numberOfCrossings(layers: Map<number, IMetroNode[]>): number {
        let crossings = 0;
        const layerKeys = Array.from(layers.keys()).sort((a, b) => a - b);
        for ( let i = 0; i < layerKeys.length - 1; i++ ) {
            const layer = layers.get(layerKeys[i])!;
            const nextLayer = layers.get(layerKeys[i + 1])!;
            if ( !nextLayer ) continue;
            const nextLayerNodeIds = new Set( nextLayer.map( n => n.publication.id ) );
            const layerLinks = this.links.filter( l => nextLayerNodeIds.has( l.target ) );
            for ( let j = 0; j < layerLinks.length; j++ ) {
                for ( let k = j + 1; k < layerLinks.length; k++ ) {
                    const l1 = layerLinks[j];
                    const l2 = layerLinks[k];
                    const l1SourceIndex = layer.findIndex( n => n.publication.id === l1.source )!;
                    const l1TargetIndex = nextLayer.findIndex( n => n.publication.id === l1.target )!;
                    const l2SourceIndex = layer.findIndex( n => n.publication.id === l2.source )!;
                    const l2TargetIndex = nextLayer.findIndex( n => n.publication.id === l2.target )!;
                    if ( (l1SourceIndex < l2SourceIndex && l1TargetIndex > l2TargetIndex) ||
                         (l1SourceIndex > l2SourceIndex && l1TargetIndex < l2TargetIndex) ) {
                        crossings++;
                    }
                }
            }
        }
        return crossings;
    }

    private median(arr: number[]): number {
        if ( arr.length === 0 ) {
            return Number.POSITIVE_INFINITY;
        }
        const sorted = arr.slice().sort( (a, b) => a - b );
        const mid = Math.floor( sorted.length / 2 );
        return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    }

    private medianSweep( layers: Map<number, IMetroNode[]> ): Map<number, IMetroNode[]> {
        const result = new Map<number, IMetroNode[]>();

        // Deep-ish copy of map structure so original map is not mutated
        const copy = Array.from(layers.keys()).sort((a, b) => a - b);
        for (const key of copy) {
            result.set(key, [...(layers.get(key) ?? [])]);
        }

        const sweep =( 
            layerIndices: number[], 
            getReferenceLayerKey: ( currentIndex: number ) => number,
            getNeighborIds: ( node: IMetroNode ) => number[]
        ): void => {
            for (const currentIndex of layerIndices) {
                const currentLayerKey = copy[currentIndex];
                const referenceLayerKey = getReferenceLayerKey(currentIndex);

                const currentLayer = [...(result.get(currentLayerKey) ?? [])];
                const referenceLayer = result.get(referenceLayerKey) ?? [];

                const referencePositions = new Map<number, number>();
                for (let i = 0; i < referenceLayer.length; i++) {
                    referencePositions.set(referenceLayer[i].publication.id, i);
                }

                const originalOrder = new Map<number, number>();
                for (let i = 0; i < currentLayer.length; i++) {
                    originalOrder.set(currentLayer[i].publication.id, i);
                }

                currentLayer.sort((a, b) => {
                    const aPositions = getNeighborIds(a)
                        .map(id => referencePositions.get(id))
                        .filter((pos): pos is number => pos !== undefined);

                    const bPositions = getNeighborIds(b)
                        .map(id => referencePositions.get(id))
                        .filter((pos): pos is number => pos !== undefined);

                    const aMedian = this.median(aPositions);
                    const bMedian = this.median(bPositions);

                    if (aMedian === bMedian) {
                        return (originalOrder.get(a.publication.id) ?? 0) - (originalOrder.get(b.publication.id) ?? 0);
                    }

                    return aMedian - bMedian;
                });

                result.set(currentLayerKey, currentLayer);
            }
        };

        // top -> bottom
        sweep(
            Array.from({ length: copy.length - 1 }, (_, i) => i + 1),
            currentIndex => copy[currentIndex - 1],
            node =>
                this.links
                    .filter(link => link.target === node.publication.id)
                    .map(link => link.source)
        );

        // bottom -> top
        sweep(
            Array.from({ length: copy.length - 1 }, (_, i) => copy.length - 2 - i),
            currentIndex => copy[currentIndex + 1],
            node =>
                this.links
                    .filter(link => link.source === node.publication.id)
                    .map(link => link.target)
        );

        return result;
    }

    /**
     * Resolves intra-layer edges by promoting nodes to fractional sublayers.
     * The sublayers are purely logical — assignCoordinates() maps all nodes
     * belonging to the same parent year to the same radius ring.
     *
     * Prerequisite: the intra-layer subgraph per year must be acyclic (DAG).
     *
     * After this method, every edge in this.links is between nodes in
     * different (possibly fractional) layer keys. createVirtualNodesAndLinks()
     * will then handle any remaining non-adjacent spans.
     */
    private resolveIntraLayerEdgesBySublayering(): void {
        const layerKeys = Array.from(this.layers.keys()).sort((a, b) => a - b);

        for (const layerKey of layerKeys) {
            const layer = this.layers.get(layerKey) ?? [];
            const layerNodeIds = new Set(layer.map(n => n.publication.id));

            const intraLinks = this.links.filter( l => layerNodeIds.has(l.source) && layerNodeIds.has(l.target) );

            if (intraLinks.length === 0) continue;

            // --- Topological sort of participating nodes ---
            // Only nodes involved in at least one intra-layer edge are promoted.
            const participatingIds = new Set<number>([
                ...intraLinks.map(l => l.source),
                ...intraLinks.map(l => l.target),
            ]);

            const adj = new Map<number, Set<number>>();
            const inDegree = new Map<number, number>();

            for (const id of participatingIds) {
                adj.set(id, new Set());
                inDegree.set(id, 0);
            }

            for (const link of intraLinks) {
                adj.get(link.source)!.add(link.target);
                inDegree.set(link.target, (inDegree.get(link.target) ?? 0) + 1);
            }

            const queue: number[] = [];
            for (const [id, deg] of inDegree.entries()) {
                if (deg === 0) queue.push(id);
            }

            const topoOrder: number[] = [];
            while (queue.length > 0) {
                const current = queue.shift()!;
                topoOrder.push(current);
                for (const neighbor of adj.get(current) ?? []) {
                    const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
                    inDegree.set(neighbor, newDeg);
                    if (newDeg === 0) 
                        queue.push(neighbor);
                }
            }

            // Assign fractional sublayer keys
            // Spaced strictly within (layerKey, layerKey + 1) to avoid collision
            // with the next integer year layer.
            // E.g. for layerKey=1998 and 3 participating nodes:
            //   node0 → 1998, node1 → 1998.33333333333, node2 → 1998.666666666666666
            const nodeToSublayer = new Map<number, number>();
            for (let i = 0; i < topoOrder.length; i++) {
                nodeToSublayer.set(
                    topoOrder[i],
                    layerKey + i / topoOrder.length
                );
            }

            // --- Rebuild this.layers ---
            // Remove participating nodes from the integer layer.
            this.layers.set(
                layerKey,
                layer.filter(n => !participatingIds.has(n.publication.id))
            );

            // Place each participating node in its new fractional sublayer.
            for (const [nodeId, subKey] of nodeToSublayer.entries()) {
                const node = layer.find(n => n.publication.id === nodeId)!;
                if (!this.layers.has(subKey)) 
                    this.layers.set(subKey, []);
                this.layers.get(subKey)!.push(node);
            }
        }

        // Re-sort this.layers so fractional sublayers interleave correctly
        // between their parent integer year and the next integer year.
        const sorted = new Map<number, IMetroNode[]>(
            [...this.layers.entries()].sort(([a], [b]) => a - b)
        );
        this.layers = sorted;
    }

    private orderVertices(): void {
        this.resolveIntraLayerEdgesBySublayering();
        this.createVirtualNodesAndLinks();
        const layers = this.layers;
        let best = new Map([...layers.entries()]);
        for ( let i = 0; i < 24; i++) {
            const transposed = this.medianSweep( best );
            if( this.numberOfCrossings( transposed ) < this.numberOfCrossings( best ) ) {
                best = transposed;
            }
        }
        this.bestLayers = best;
        this.assignLayersToNodes( best );
    }

    // Assigns each node a layer property based on the layer it belongs to. This is used in the assignCoordinates step to determine the distance of each node from the center. Virtual nodes are assigned a layer as well, but this is only used for the crossing minimization and they are not part of the final layout.
    private assignLayersToNodes(layers: Map<number, IMetroNode[]>): void {
        for (const [layerKey, layerNodes] of layers.entries()) {
            for (const node of layerNodes) {
                node.layer = layerKey;
            }
        }
    }

    // Assign radial coordinates to already existing nodes based on their layer and position within the layer. 
    // Virtual nodes are ignored in this step, as they are only used for the crossing minimization and not part of the final layout.
    private assignCoordinates(): void {

    }
}