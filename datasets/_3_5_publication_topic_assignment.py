import json
from collections import Counter, OrderedDict

def assign_clusters_to_publications(publications, clusters, cluster_definitions: list):
    publication_cluster_assignment = [
        {
            'id': entry['id'],
            "clusters": list({int(cluster_for_fos(topic['name'], clusters)) for topic in entry["fos"]}),
            'title': entry['title'],
            'authors': entry['authors'],
            'year': entry['year'],
            'venue': entry['venue']['raw']
        }
        for entry in publications
    ]

    # Remove publications with no assigned clusters
    publication_cluster_assignment = [entry for entry in publication_cluster_assignment if entry['clusters']]

    # Remove publications with more than 3 assigned clusters
    publication_cluster_assignment = [
        entry for entry in publication_cluster_assignment
        if len(entry['clusters']) <= 3
    ]

    #Remove publications that are assigned a cluster that no other publication has and remove "lonely" cluster in not removed publications
    cluster_counts = Counter()
    for entry in publication_cluster_assignment:
        for c in entry.get('clusters', []):
            cluster_counts[c] += 1

    for entry in publication_cluster_assignment:
        entry['clusters'] = [c for c in entry['clusters'] if cluster_counts[c] > 1]

    publication_cluster_assignment = [
        entry for entry in publication_cluster_assignment
        if entry['clusters']
    ]

    input_structure = {
        'publications': publication_cluster_assignment,
        'clusters': cluster_definitions
    }

    with open('output/publication_cluster_assignments.json', 'w') as f_out:
        json.dump(input_structure, f_out, indent=2)
def cluster_for_fos(fos, clusters):
    for key, values in clusters.items():
        if fos in values:
            return key
    print(f'No cluster found for field of study: {fos}')
    return None