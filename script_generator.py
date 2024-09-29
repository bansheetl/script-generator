import tqdm    
import os

def find_slide_match(slide_matches, slide, current_paragraph_id):
    for slide_match in slide_matches:
        if slide_match['slide_file'] == slide:
            match_results = slide_match['results']
            match_results = [result for result in match_results if int(result['paragraph_id']) > current_paragraph_id]
            if len(match_results) == 0:
                return current_paragraph_id + 1
            else:
                match = min(match_results, key=lambda x: int(x['paragraph_id']))
                return int(match['paragraph_id'])-1
    raise ValueError(f"Slide {slide} not found in slide matches")

def generate_script(output_folder):
    print("Generating script...")
    
    script = output_folder.read_json_script()
    paragraphs = sorted(script['content'], key=lambda x: x['id'])
    slides = output_folder.load_slides()
    slide_matches = output_folder.read_slide_matches()
    output_file_path = output_folder.get_script_file()
    # paragraph ID is 1-based, index is 0-based
    current_paragraph_idx, next_paragraph_idx = 0, 0
    with open(output_file_path, 'w', encoding='utf-8') as writer:
        writer.write(":imagesdir: slides\n\n")
        writer.write(f"image::{os.path.basename(slides[0])}[]\n\n")
        slides = slides[1:]
        
        progress_bar = tqdm.tqdm(total=len(slides), desc="Inserting slides into script")
        
        for slide in slides:
            next_paragraph_idx = find_slide_match(slide_matches, slide, current_paragraph_idx+1)
            for paragraph in paragraphs[current_paragraph_idx:next_paragraph_idx]:
                writer.write(f"{paragraph['text']}\n\n")
            writer.write(f"image::{os.path.basename(slide)}[]\n\n")
            current_paragraph_idx = next_paragraph_idx
            progress_bar.update(1)
            
        progress_bar.close()
        
        for paragraph in paragraphs[current_paragraph_idx:]:
            writer.write(f"{paragraph['text']}\n\n")
        
        print(f"Script generated at {output_file_path}")