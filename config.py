import configparser

# Initialize the parser
config = configparser.ConfigParser()

# Read the properties file
config.read('config.properties')

# AzureOpenAI
azure_openai_api_key = config.get('AzureOpenAI', 'azure_openai_api_key')
azure_openai_version = config.get('AzureOpenAI', 'azure_openai_version')
azure_openai_endpoint = config.get('AzureOpenAI', 'azure_openai_endpoint')

# OpenAI
openai_organization = config.get('OpenAI', 'organization')
openai_project = config.get('OpenAI', 'project')
openai_api_key = config.get('OpenAI', 'openai_api_key')

# AzureSearch
search_api_endpoint = config.get('AzureSearch', 'search_api_endpoint')
search_api_key = config.get('AzureSearch', 'search_api_key')
index_name = config.get('AzureSearch', 'index_name')