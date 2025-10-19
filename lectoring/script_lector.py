import embeddings
import lectoring.doc_extractor as de
import tqdm
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from llm import get_chat_model
from prompt_loader import load_prompt


def _extract_text_from_message(message: AIMessage) -> str:
    """Normalize LangChain message content into printable text."""
    content = message.content
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, dict) and item.get("type") == "text":
                parts.append(item.get("text", ""))
        return "".join(parts)
    return str(content)
    
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
    
    client = get_chat_model()
    system_message = SystemMessage(content=load_prompt("script_lector_system"))
    response_text = ""
    lectored_paragraphs = []
    chunks = de.extract_chunks_from_docx(file, 1500)
    print(f"Lectoring {len(chunks)} chunks")
    progress_bar = tqdm.tqdm(total=len(chunks), unit="chunk")
    for idx, chunk in enumerate(chunks):
        previous_context = "\n\n".join(lectored_paragraphs[-3:])

        user_message = ( 
            "REFERENCE_PREVIOUS:\n"
            f"{previous_context or '<none>'}\n\n"
            "CURRENT:\n"
            f"{chunk}"
        )

        current_messages = [
            system_message,
            HumanMessage(content=user_message),
        ]

        chunk_response = _extract_text_from_message(client.invoke(current_messages)).strip()
        response_text += chunk_response + "\n"
        lectored_paragraphs.extend(
            [para for para in chunk_response.split("\n\n") if para.strip()]
        )
        progress_bar.update(1)

    progress_bar.close()
    return response_text
    