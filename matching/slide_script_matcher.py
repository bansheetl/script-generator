import config as cfg
from azure.core.credentials import AzureKeyCredential  
from azure.search.documents import SearchClient  
from tqdm import tqdm
from azure.search.documents.models import (
    VectorizedQuery,
)

credential = AzureKeyCredential(cfg.search_api_key)
search_client = SearchClient(cfg.search_api_endpoint, cfg.index_name, credential)  

def match_slides_with_script(repository):
    if repository.read_slide_matches():
        print("Slides already matched with script")
        return
    
    slides = repository.read_slide_descriptions()
    results = []
    # Initialize the progress bar
    print(f"Matching {len(slides)} slides with script")
    progress_bar = tqdm(total=len(slides), desc="Matching slides with script")
    for slide in slides:
        vector_query = VectorizedQuery(vector=slide["embeddings"], k_nearest_neighbors=3, fields="content_vector")
    
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
    
    repository.save_slide_matches(results)