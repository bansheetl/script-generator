import config as cfg
from functools import lru_cache
from langchain_openai import AzureChatOpenAI, AzureOpenAIEmbeddings

DEFAULT_CHAT_DEPLOYMENT = "gpt-4o"
DEFAULT_EMBEDDING_DEPLOYMENT = "text-embedding-ada-002"


@lru_cache(maxsize=None)
def get_chat_model(*, deployment: str = DEFAULT_CHAT_DEPLOYMENT, temperature: float = 0.0):
    """Return a cached Azure Chat model configured via LangChain."""
    return AzureChatOpenAI(
        api_key=cfg.azure_openai_api_key,
        api_version=cfg.azure_openai_version,
        azure_endpoint=cfg.azure_openai_endpoint,
        azure_deployment=deployment,
        temperature=temperature,
    )


@lru_cache(maxsize=None)
def get_embedding_model(*, deployment: str = DEFAULT_EMBEDDING_DEPLOYMENT):
    """Return a cached Azure embeddings model configured via LangChain."""
    return AzureOpenAIEmbeddings(
        api_key=cfg.azure_openai_api_key,
        api_version=cfg.azure_openai_version,
        azure_endpoint=cfg.azure_openai_endpoint,
        azure_deployment=deployment,
    )
