import json
import os
from tqdm import tqdm

class Repository:
    
    def __init__(self, input_folder):
        if not os.path.isdir(input_folder):
            raise ValueError(f"The folder {input_folder} does not exist.")
        
        input_folder_name = os.path.basename(input_folder)
        self.folder_name = os.path.join("output", input_folder_name)
        if not os.path.isdir(self.folder_name):
            os.makedirs(self.folder_name)
        

        input_files = os.listdir(input_folder)
        docx_files = [file for file in input_files if file.endswith('.docx')]
        pdf_files = [file for file in input_files if file.endswith('.pdf')]

        if len(docx_files) != 1 or len(pdf_files) != 1:
            raise ValueError(f"The folder {input_folder} must contain exactly one .docx and .pdf file.")
        
        self._transcript_file = os.path.join(input_folder, docx_files[0])
        self._slides_file = os.path.join(input_folder, pdf_files[0])
        
        # Validating that the script ID is a two-digit number
        self.get_script_id()
        
    def get_transcript_file(self):
        return self._transcript_file
    
    def get_slides_file(self):
        return self._slides_file
        
    def get_script_id(self):
        script_id = self.__get_file_basename()[:2]
        if not script_id.isdigit():
            raise ValueError("The first two characters of the transcript file name must be digits.")
        return script_id
    
    def get_script_file(self):
        file_name = self.__get_file_basename()
        return os.path.join(self.folder_name, file_name + ".adoc")
    
    def save_lectored_output(self, lectored_output):
        lectored_output_file = self.__get_lectored_output_file()
        print(f"Writing lectored output to file {lectored_output_file}")
        with open(lectored_output_file, "w", encoding="utf-8") as f:
            f.write(lectored_output)
    
    def read_lectored_output(self):
        lectored_output_file = self.__get_lectored_output_file()
        if not os.path.exists(lectored_output_file):
            return None
        with open(lectored_output_file, "r", encoding="utf-8") as f:
            return f.read()
    
    def save_json_script(self, json_script):
        json_script_file = self.__get_json_script_file()
        with open(json_script_file, 'w', encoding='utf-8') as json_file:
            json.dump(json_script, json_file, ensure_ascii=False, indent=4)
        return json
    
    def read_json_script(self):
        json_script_file = self.__get_json_script_file()
        if not os.path.exists(json_script_file):
            return None
        with open(json_script_file, 'r', encoding='utf-8') as file:
            return json.load(file)
            
    def save_slides(self, slides):
        slides_folder = self.__get_slides_folder()
        print(f"Saving {len(slides)} slide images to {slides_folder}")
        for i, slide in enumerate(tqdm(slides, desc="Saving slide images")):
            slide.save(f'{slides_folder}/page_{i + 1:03d}.png', 'PNG')
        return self.load_slides()

    def load_slides(self):
        slides = []
        for filename in os.listdir(self.__get_slides_folder()):
            if filename.endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp')):
                slides.append(os.path.join(self.__get_slides_folder(), filename))
        slides.sort()
        return slides

    def save_slide_descriptions(self, descriptions):
        slide_descriptions_file = self.__get_slide_descriptions_file()
        print(f"Writing slide description to file {slide_descriptions_file}")
        with open(slide_descriptions_file, "w", encoding="utf-8") as f:
            json.dump(descriptions, f, indent=4, ensure_ascii=False)
    
    def read_slide_descriptions(self):
        slide_descriptions_file = self.__get_slide_descriptions_file()
        if not os.path.exists(slide_descriptions_file):
            return None
        print(f"Reading slide descriptions from file {slide_descriptions_file}")
        with open(slide_descriptions_file, 'r', encoding='utf-8') as file:
            return json.load(file)
            
    
    def save_slide_matches(self, matches):
        slide_matches_file = self.__get_slide_matches_file()
        print(f"Writing slide match to file {slide_matches_file}")
        with open(slide_matches_file, 'w', encoding='utf-8') as outfile:
            json.dump(matches, outfile, ensure_ascii=False, indent=4)
            
    def read_slide_matches(self):
        slide_matches_file = self.__get_slide_matches_file()
        if not os.path.exists(slide_matches_file):
            return None
        print(f"Reading slide matches from file {slide_matches_file}")
        with open(slide_matches_file, 'r', encoding='utf-8') as file:
            return json.load(file)

    def __get_slides_folder(self):
        slides_folder = os.path.join(self.folder_name, 'slides')
        if not os.path.exists(slides_folder):
            os.makedirs(slides_folder)
        return slides_folder
            
    def __get_json_script_file(self):
        file_name = self.__get_file_basename()
        return os.path.join(self.folder_name, f"{file_name}.json")

    def __get_slide_descriptions_file(self):
        return os.path.join(self.folder_name, 'slide_descriptions.json')
    
    def __get_slide_matches_file(self):
        return os.path.join(self.folder_name, 'slide_matches.json')
            
    def __get_lectored_output_file(self):
        file_name = self.__get_file_basename()
        return os.path.join(self.folder_name, f"{file_name}_lectored.txt")
    
    def __get_file_basename(self):        
        file_name, file_extension = os.path.splitext(os.path.basename(self.get_transcript_file()))
        return file_name
    
    def __str__(self):
        return f"Output folder: {self.folder_name}"
    