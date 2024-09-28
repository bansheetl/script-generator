
import config as cfg
import json
import sys

from azure.core.credentials import AzureKeyCredential  
from azure.search.documents import (
    SearchClient,
    IndexDocumentsBatch
)
from azure.core.exceptions import HttpResponseError

credential = AzureKeyCredential(cfg.search_api_key)

def read_script(json_file_path):
    with open(json_file_path, 'r', encoding='utf-8') as file:
        data = json.load(file)

    # Extract the documents from the JSON content
    print(f"Read script from {json_file_path}")
    return data

def handle_error(error):
    raise ValueError(e)

def store_script(script):
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
    
if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python script_storage.py <path_to_json_file>")
        sys.exit(1)

    json_file_path = sys.argv[1]
    script = read_script(json_file_path)
    store_script(script)