import config as cfg
from openai import AzureOpenAI
import sys
import tqdm
import base64
import embeddings
import interpreting.slide_extractor as extractor

# Load your API key from an environment variable

client = AzureOpenAI(
        api_key=cfg.azure_openai_api_key,
        api_version=cfg.azure_openai_version,
        azure_endpoint=cfg.azure_openai_endpoint,
    )


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
    
    messages=[
        {"role": "system", 
        "content": 
            '''Du bist ein Professor für Software Architektur. Du sollst eine Slide von einer Vorlesung 
            über Software Architektur inhaltlich beschreiben. Die Slide wird als Bild übergeben. 
            Gib als Ergebnis eine Beschreibung mit maximal 7 Sätzen zurück.
            '''}
    ]

    descriptions = []
    progress_bar = tqdm.tqdm(total=len(slide_files), unit="chunk")
    for slide_file in slide_files:
        current_message = messages.copy()
        with open(slide_file, "rb") as f:
            encoded_content = base64.b64encode(f.read()).decode('utf-8')
            current_message.append({
                "role": "user", 
                "content": [
                    {
                        "type": "image_url", 
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{encoded_content}"
                        }
                    }]})
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=current_message)
        
        response_text = response.choices[0].message.content
        descriptions.append({
            "slide_file": slide_file,
            "description": response_text,
            "embeddings": embeddings.generate_embeddings(response_text)
        })
        progress_bar.update(1)

    progress_bar.close()
    
    repository.save_slide_descriptions(descriptions)