import config as cfg
from openai import AzureOpenAI

client = AzureOpenAI(
        api_key=cfg.azure_openai_api_key,
        api_version=cfg.azure_openai_version,
        azure_endpoint=cfg.azure_openai_endpoint,
    )

def generate_embeddings(text):
    response = client.embeddings.create(model="text-embedding-ada-002", input=text)
    return response.data[0].embedding