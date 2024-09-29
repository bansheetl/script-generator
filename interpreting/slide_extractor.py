from pdf2image import convert_from_path
import tqdm

def extract_slides(pdf_path):
    print(f"Extracting slides from {pdf_path}...")
    images = convert_from_path(pdf_path)
    return images
