import sys
import tqdm
import base64
import embeddings
import interpreting.slide_extractor as extractor
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


def interpret_slides(repository):
    if repository.read_slide_descriptions():
        print("Slides already interpreted")
        return
    
    slides_file = repository.get_slides_file()
    slide_files = repository.load_slides()
    if len(slide_files) == 0:
        slides = extractor.extract_slides(slides_file)
        slide_files = repository.save_slides(slides)
        
    if not slide_files:
        print(f"No slide images were extracted from {slides_file}.")
        sys.exit(1)
    
    print(f"Interpreting {len(slide_files)} slides...")
    
    system_message = SystemMessage(content=load_prompt("slide_interpreter_system"))
    client = get_chat_model()

    descriptions = []
    progress_bar = tqdm.tqdm(total=len(slide_files), unit="chunk")
    for slide_file in slide_files:
        with open(slide_file, "rb") as f:
            encoded_content = base64.b64encode(f.read()).decode('utf-8')
        current_messages = [
            system_message,
            HumanMessage(
                content=[
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{encoded_content}"
                        },
                    }
                ]
            ),
        ]

        response_text = _extract_text_from_message(client.invoke(current_messages))
        descriptions.append({
            "slide_file": slide_file,
            "description": response_text,
            "embeddings": embeddings.generate_embeddings(response_text)
        })
        progress_bar.update(1)

    progress_bar.close()
    
    repository.save_slide_descriptions(descriptions)