import json
import sys
import os



def load_json(file_path):
    with open(file_path, 'r', encoding='utf-8') as file:
        data = json.load(file)
    return data
    
def load_images_from_folder(folder_path):
    images = []
    for filename in os.listdir(folder_path):
        if filename.endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp')):
            images.append(os.path.basename(filename))
    images.sort()
    return images

def find_slide_match(slide_matches, slide, current_paragraph_id):
    for slide_match in slide_matches:
        if slide_match['slide_file'] == slide:
            match_results = slide_match['results']
            match_results = [result for result in match_results if int(result['paragraph_id']) > current_paragraph_id]
            if len(match_results) == 0:
                raise ValueError(f"No match found for slide {slide}")
            match = min(match_results, key=lambda x: int(x['paragraph_id']))
            return match
    raise ValueError(f"Slide {slide} not found in slide matches")

def generate_script(file_path):
    script = load_json(file_path)
    paragraphs = sorted(script['content'], key=lambda x: x['id'])
    parent_folder = os.path.dirname(file_path)
    slides_folder = os.path.join(parent_folder, 'slides')
    slides = load_images_from_folder(slides_folder)
    slide_matches = load_json(os.path.join(slides_folder, 'slide_matches.json'))
    output_file_path = os.path.splitext(file_path)[0] + '.adoc'
    # paragraph ID is 1-based, index is 0-based
    current_paragraph_idx, next_paragraph_idx = 0, 0
    with open(output_file_path, 'w', encoding='utf-8') as writer:
        writer.write(":imagesdir: slides\n\n")
        writer.write(f"image::{slides[0]}[]\n\n")
        slides = slides[1:]
        for slide in slides:
            match = find_slide_match(slide_matches, slide, current_paragraph_idx+1)
            next_paragraph_idx = int(match['paragraph_id'])-1
            for paragraph in paragraphs[current_paragraph_idx:next_paragraph_idx]:
                writer.write(f"{paragraph['text']}\n\n")
            writer.write(f"image::{slide}[]\n\n")
            current_paragraph_idx = next_paragraph_idx
        
        writer.write(f"{paragraphs[current_paragraph_idx]['text']}\n\n")
        

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python script_generator.py <path_to_json_file>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    generate_script(file_path)