import json
import statistics


def filter_people_with_low_freq_fos(data):
    authors = {}

    if data is None:
        with open('output/dblp.v12.2_filtered_fos.json', 'r') as f_in:
            data = json.load(f_in)

    for entry in data:
        for author in entry['authors']:
            author_name = author['name']
            author_id = author['id']
            if author_id not in authors:
                authors[author_id] = {"names": [], "fos": []}
            if author_name not in authors[author_id]["names"]:
                authors[author_id]["names"].append(author_name)
            for topic in entry['fos']:
                topic_name = topic['name']
                if topic_name not in authors[author_id]["fos"]:
                    authors[author_id]["fos"].append(topic_name)

    authors_number_fos = {k: len(v['fos']) for k, v in authors.items()}
    values = list(authors_number_fos.values())
    std_dev = statistics.stdev(values)
    authors = { k:v for k, v in authors.items() if len(v['fos']) >= std_dev * 4 }
    with(open('output/people_fos_assignment.json', 'w')) as f_out:
        json.dump(authors, f_out)
    return authors