import os
import config as cfg
from openai import OpenAI
import sys
import tqdm
import base64
import json

# Load your API key from an environment variable

client = OpenAI(
    organization='org-l3Zg6erY9OaGazrnHq122oLu',
    project='proj_fGvFTvQ1VchG4083AYQNogNG',
    api_key = cfg.openai_api_key
)

def interpret_slides(dir):
    slide_files = [os.path.join(dir, f) for f in os.listdir(dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]

    if not slide_files:
        print(f"No slide images found in directory {file}.")
        sys.exit(1)
        

    messages=[
        {"role": "system", 
        "content": 
            '''Du bist ein Professor für Software Architektur. Du sollst eine Slide von einer Vorlesung 
            inhaltlich beschreiben. Die Slide wird als Bild übergeben. 
            Gib als Ergebnis eine Beschreibung mit maximal 7 Sätzen zurück.
            '''}
    ]

    descriptions = []
    print(f"Processing {len(slide_files)} slide images...")
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
            "description": response_text
        })
        progress_bar.update(1)

    progress_bar.close()

    # output to file instead   
    print(f"Writing slide description to file {dir + '/slide_descriptions.json'}")
    with open(file + '/slide_descriptions.json', "w", encoding="utf-8") as f:
        json.dump(descriptions, f, indent=4, ensure_ascii=False)
    
    
if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python slide_interpreter.py <path_to_slide_image_directory>")
        sys.exit(1)

    file = sys.argv[1]
    interpret_slides(file)