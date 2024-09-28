import sys
import json
import os
import config as cfg
import embeddings
from openai import AzureOpenAI
from azure.core.credentials import AzureKeyCredential  
from azure.search.documents import SearchClient  
from tqdm import tqdm
from azure.search.documents.models import (
    VectorizedQuery,
)

credential = AzureKeyCredential(cfg.search_api_key)
search_client = SearchClient(cfg.search_api_endpoint, cfg.index_name, credential)  

def match_slides_with_script(slides_json):
    
    with open(slides_json, 'r', encoding='utf-8') as file:
        data = json.load(file)
    # Extract the documents from the JSON content
    slides = data

    results = []
    # Initialize the progress bar
    print(f"Matching {len(slides)} slides with script")
    progress_bar = tqdm(total=len(slides), desc="Matching slides with script")
    for slide in slides:
        vector_query = VectorizedQuery(vector=embeddings.generate_embeddings(slide["description"]), k_nearest_neighbors=3, fields="content_vector")
    
        # Pure Vector Search
        slide_results = search_client.search(  
            search_text=None,  
            vector_queries= [vector_query], 
            select=["file_id", "paragraph_id", "text"] 
        )
        slide_results_mapped = [
            {
            "file_id": result["file_id"],
            "paragraph_id": result["paragraph_id"],
            "text": result["text"],
            "score": result["@search.score"]
            }
            for result in slide_results
        ]
        
        results.append({
            "slide_file": slide["slide_file"],
            "results": slide_results_mapped
        })
        # Update the progress bar
        progress_bar.update(1)

    # Close the progress bar
    progress_bar.close()
    
    target_file = os.join(os.path.dirname(json_file_path),'slide_matcher.json')
    print(f"Writing slide match to file slide_match.json")
    with open(target_file, 'w', encoding='utf-8') as outfile:
        json.dump(results, outfile, ensure_ascii=False, indent=4)
    
    
if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python script_storage.py <path_to_json_file>")
        sys.exit(1)

    json_file_path = sys.argv[1]
    match_slides_with_script(json_file_path)