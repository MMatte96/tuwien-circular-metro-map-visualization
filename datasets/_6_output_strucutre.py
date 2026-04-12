def create_final_output(data, authors, cluster):
    # [
    #  {
    #   year: {
    #    "author": {
    #     "cluster": ["collaborator", ...]
    #    }
    #   }
    #  }
    # ]
    d = {}
    years = sorted({item["year"] for item in data})
    for publication in data:
        year = publication["year"]
        if year not in d:
            d[year] = {}
        
    pass