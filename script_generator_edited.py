import sys
import os
import json
import tqdm
import subprocess


WARNING_TEMPLATE_PATH = os.path.join(
    os.path.dirname(__file__),
    "templates",
    "warning.adoc",
)


def load_warning_block():
    try:
        with open(WARNING_TEMPLATE_PATH, "r", encoding="utf-8") as warning_file:
            warning_content = warning_file.read().strip()
            return f"{warning_content}\n\n" if warning_content else ""
    except FileNotFoundError:
        tqdm.tqdm.write(
            f"Warning template not found at {WARNING_TEMPLATE_PATH}. Proceeding without warning block."
        )
        return ""


def create_asciidoc_script(json_path):
    
    with open(json_path, 'r', encoding="utf-8") as json_file:
        data = json.load(json_file)

    paragraphs = data['content']
    print(f"Script for {len(paragraphs)} paragraphs loaded")
    
    output_file_path = json_path.replace(".json", ".adoc")
    with open(output_file_path, 'w', encoding='utf-8') as writer:
        writer.write(":imagesdir: slides\n\n")
        writer.write(load_warning_block())
        
        progress_bar = tqdm.tqdm(total=len(paragraphs), desc="Writing paragraphs")
        
        for paragraph in paragraphs:
            tqdm.tqdm.write(f"Writing paragraph {paragraph['id']}")
            slides = paragraph.get('selectedSlides')
            if not slides:
                slides = [candidate for candidate in paragraph.get('slideCandidates', []) if candidate.get('selected')]
            for slide in slides or []:
                slide_file = slide.get('slide_file')
                if slide_file:
                    writer.write(f"image::{os.path.basename(slide_file)}[]\n\n")
            writer.write(f"{paragraph['text']}\n\n")
            progress_bar.update(1)
            
        progress_bar.close()
        
        print(f"Script generated at {output_file_path}")

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python script_generator_edited.py <directory>")
        sys.exit(1)

    directory = sys.argv[1]
    script_json_path = os.path.join(directory, 'script_edited.json')

    if not os.path.isfile(script_json_path):
        print(f"Error: {script_json_path} does not exist.")
        sys.exit(1)
        
    create_asciidoc_script(script_json_path)
    
    adoc_file_path = script_json_path.replace(".json", ".adoc")
    pdf_file_path = script_json_path.replace(".json", ".pdf")

    try:
        subprocess.run(['asciidoctor-pdf', adoc_file_path, '-o', pdf_file_path], check=True)
        print(f"PDF generated at {pdf_file_path}")
    except subprocess.CalledProcessError as e:
        print(f"Error generating PDF: {e}")
