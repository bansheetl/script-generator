import sys
import os
import json
from openai import AzureOpenAI

client = AzureOpenAI(
        api_key=os.environ.get('OPENAI_API_KEY'),
        api_version="2024-02-01",
        azure_endpoint=os.environ.get('AZURE_OPENAI_ENDPOINT'),
    )

def main():
    if len(sys.argv) != 2:
        print("Usage: python script_json_converter.py <input_file>")
        sys.exit(1)
    input_file = sys.argv[1]

    if not os.path.isfile(input_file):
        print(f"File {input_file} does not exist.")
        sys.exit(1)

    with open(input_file, 'r') as file:
        content = file.read()

    paragraphs = content.split('\n\n')
    paragraphs = [p for p in paragraphs if p.strip()]  # Remove empty paragraphs

    result = {
        "id": os.path.basename(input_file),
        "content": [
            {
                "id": idx + 1,
                "text": para,
                "embeddings": client.embeddings.create(model="text-embedding-ada-002", input=para).data[0].embedding
            } for idx, para in enumerate(paragraphs)
        ]
    }

    output_file = os.path.splitext(input_file)[0] + '.json'
    with open(output_file, 'w', encoding='utf-8') as json_file:
        json.dump(result, json_file, ensure_ascii=False, indent=4)

    print(f"Converted content written to {output_file}")

if __name__ == "__main__":
    main()