from _2_low_freq_filter import remove_low_freq_fos
from _3_hierarchical_clustering import create_hierarchical_clustering
from _3_5_publication_topic_assignment import assign_clusters_to_publications
from _4_person_fos_filter import filter_people_with_low_freq_fos
from _5_people_topic_assignment import assign_clusters_to_people
from _6_output_strucutre import create_final_output

# step 1 (filtering of publication by venue) is done separately because it takes a long time

data_without_low_freq_fos = remove_low_freq_fos()
clusters = create_hierarchical_clustering(data_without_low_freq_fos)
# assign clusters to publications
assign_clusters_to_publications(data_without_low_freq_fos, clusters)

# people = filter_people_with_low_freq_fos(data_without_low_freq_fos)
# assign_clusters_to_people(people, clusters)
# create_final_output(data_without_low_freq_fos, people, clusters)