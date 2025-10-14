import config as cfg
import embeddings
import lectoring.doc_extractor as de
import tqdm
from openai import AzureOpenAI
from prompt_loader import load_prompt
    
def convert_to_json(script_id, content):
    print(f"Converting lectored output to JSON for script {script_id}")
    paragraphs = content.split('\n\n')
    paragraphs = [p for p in paragraphs if p.strip()]  # Remove empty paragraphs
    result = {
        "id": script_id,
        "content": [
            {
                "id": idx + 1,
                "text": para,
                "embeddings": embeddings.generate_embeddings(para)
            } for idx, para in enumerate(tqdm.tqdm(paragraphs))
        ]
    }
    return result

def lector(repository):
    if repository.read_json_script():
        print("Script already lectored")
        return
    
    lectored_output = repository.read_lectored_output()
    if not lectored_output:
        lectored_output = lector_raw(repository)
        repository.save_lectored_output(lectored_output)
        
    json = convert_to_json(repository.get_script_id(), lectored_output)
    repository.save_json_script(json)

def lector_raw(repository):
    file = repository.get_transcript_file()
    print(f"Lectoring transcript from {file}")
    
    client = AzureOpenAI(
        api_key=cfg.azure_openai_api_key,
        api_version=cfg.azure_openai_version,
        azure_endpoint=cfg.azure_openai_endpoint,
    )

    messages = [
        {"role": "system", "content": load_prompt("script_lector_system")}
    ]
    response_text = ""
    chunks = de.extract_chunks_from_docx(file, 1500)
    print(f"Lectoring {len(chunks)} chunks")
    progress_bar = tqdm.tqdm(total=len(chunks), unit="chunk")
    for chunk in chunks:
        # create copy of messages
        current_message = messages.copy()
        current_message.append({"role": "user", "content": chunk})
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=current_message)
        # append to response_text
        response_text += response.choices[0].message.content + "\n"
        progress_bar.update(1)

    progress_bar.close()
    return response_text
    