from llm import get_embedding_model

_embedding_model = get_embedding_model()

def generate_embeddings(text):
    return _embedding_model.embed_query(text)