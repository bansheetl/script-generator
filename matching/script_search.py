
import config as cfg

from azure.core.credentials import AzureKeyCredential  
from azure.search.documents import (
    SearchClient
)
from azure.core.exceptions import HttpResponseError
import time

credential = AzureKeyCredential(cfg.search_api_key)

def is_script_search_initialized(repository):
    # Check if the index exists
    search_client = SearchClient(cfg.search_api_endpoint, cfg.index_name, credential)  
    try:
        search_client.get_document(key=f"{repository.get_script_id()}_1")
        return True
    except HttpResponseError as e:
        return False

def init_script_search(repository):
    
    if is_script_search_initialized(repository):
        print("Script search already initialized")
        return
    
    script = repository.read_json_script()
    print(f"Initializing script search for script {script['id']}")
    # Create a SearchIndexingBufferedSender
    search_client = SearchClient(cfg.search_api_endpoint, cfg.index_name, credential)  
    
    documents = []
    for paragraph in script["content"]:
        document = {
            "file_id": script["id"],
            "paragraph_id": str(paragraph["id"]),
            "vector_id": f"{script["id"]}_{paragraph['id']}",
            "text": paragraph["text"],
            "content_vector": paragraph["embeddings"]
        }
        documents.append(document)

    print(f"Processing {len(documents)} documents...")    
    try:
        # Add upload actions for all documents in a single call
        search_client.upload_documents(documents=documents)

    except HttpResponseError as e:
        print(f"An error occurred: {e}")

    print(f"Uploaded {len(documents)} documents in total")
    
    max_wait_time = 10 * 60  # 10 minutes
    wait_interval = 30  # 30 seconds
    waited_time = 0

    while waited_time < max_wait_time:
        if is_script_search_initialized(repository):
            print("Script search successfully initialized")
            break
        time.sleep(wait_interval)
        waited_time += wait_interval
    else:
        print("Failed to initialize script search within the maximum wait time")