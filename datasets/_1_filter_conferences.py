import decimal
import json
import ijson
import re

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, decimal.Decimal):
            return float(obj)
        return super().default(obj)

def in_relevant_conference(venue):
    if 'IEEE Transactions on Visualization and Computer Graphics' in venue:
        return True
    if 'EuroVis' in venue:
        return True
    if ('Conference on Human Factors in Computing Systems' in venue or re.search(r'\bCHI\b', venue)) and 'Symposium of Chinese CHI' not in venue:
        return True
    return False

input_file = 'input/dblp.v12.json'
output_json = 'output/dblp.v12.1_filtered.json'

with open(input_file, 'rb') as f_in, open(output_json, 'w') as f_out:

    f_out.write('[\n')
    first = True
    for entry in ijson.items(f_in, 'item'):
        try:
            if in_relevant_conference(entry['venue']['raw']):
                if not first:
                    f_out.write(',\n')
                else:
                    first = False
                f_out.write(json.dumps(entry, cls=DecimalEncoder))
        except KeyError:
            continue
    f_out.write('\n]')

