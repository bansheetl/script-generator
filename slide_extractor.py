# Step 1: Install the pdf2image library
# Run this command in your terminal:
# pip install pdf2image

# Step 2: Import the necessary modules
from pdf2image import convert_from_path

# Step 3: Convert each page of the PDF to an image
pdf_path = '05_BAI5-AI_TechnischeArchitektur_Backend.pdf'
images = convert_from_path(pdf_path)

# Step 4: Save each image to a file
for i, image in enumerate(images):
    image.save(f'output_slides/page_{i + 1}.png', 'PNG')