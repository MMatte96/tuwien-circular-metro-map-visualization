import json
import statistics

def remove_low_freq_fos():
    freq = {}
    with open('output/dblp.v12.1_filtered.json', "r") as f:
        data = json.load(f)

    for entry in data:
        for topic in entry['fos']:
            name = topic['name']
            if name not in freq:
                freq[name] = 1
            else:
                freq[name] += 1

    sorted_freq = dict(sorted(freq.items(), key=lambda item: item[1], reverse=True))

    with open('output/fos_frequencies.json', 'w') as f_out:
        json.dump(sorted_freq, f_out)

    values = list(freq.values())
    std_dev = statistics.stdev(values)

    filtered_freq = {k: v for k, v in freq.items() if v >= (std_dev / 2)}
    filtered_fos_names = set(filtered_freq.keys())

    for entry in data:
        for _ in entry['fos']:
            entry['fos'] = [fos_obj for fos_obj in entry['fos'] if fos_obj['name'] in filtered_fos_names]

    # Remove entries with no remaining fields of study
    data = [entry for entry in data if entry['fos']]

    with open('output/dblp.v12.2_filtered_fos.json', 'w') as f_out:
        json.dump(data, f_out)
    return data