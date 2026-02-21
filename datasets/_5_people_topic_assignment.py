import json

def assign_clusters_to_people(people, clusters):
    cluster_assignment =  {
        i: {"clusters": list({int(cluster_for_fos(topic, clusters)) for topic in entry["fos"]}), 'names': entry['names']}
        for i, entry in people.items()}
    with(open('output/cluster_assignments.json', 'w')) as f_out:
        json.dump(cluster_assignment, f_out)

def cluster_for_fos(fos, clusters):
    for key, values in clusters.items():
        if fos in values:
            return key
    return None