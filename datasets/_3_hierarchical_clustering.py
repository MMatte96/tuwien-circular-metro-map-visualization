import collections
from collections import defaultdict

from scipy.cluster.hierarchy import linkage, fcluster
from sklearn.feature_extraction.text import TfidfVectorizer

def create_hierarchical_clustering(data):
    topics = []
    for entry in data:
        for topic in entry['fos']:
            topics.append(topic['name'])

    all_topics = list(set(topics))

    vectorizer = TfidfVectorizer()
    X = vectorizer.fit_transform(all_topics)

    linkage_matrix = linkage(X.toarray(), method='ward')
    
    # smaller t means more, smaller clusters
    # higher t means very broad topic groups
    cluster_labels = fcluster(linkage_matrix, t=1.8, criterion='distance')

    clusters = defaultdict(list)
    for topic, label in zip(all_topics, cluster_labels):
        clusters[label].append(topic)

    clusters = collections.OrderedDict(sorted(clusters.items()))

    print("\nCLUSTERING RESULTS:\n")
    for cid, topics in clusters.items():
        print(f"Cluster {cid}:")
        for topic in topics:
            print(f" - {topic}")
        print()

    return clusters
