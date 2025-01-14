from docx import Document
import re


def extract_paragraphs_from_docx(file_path):
    print(f"Extracting paragraphs from {file_path}")
    doc = Document(file_path)
    paragraphs = []
    timestamp_pattern = re.compile(r'\d+:\d+(:\d+)?')
    
    for para in doc.paragraphs:
        cleaned_para = timestamp_pattern.sub('', para.text).strip()
        if cleaned_para:
            paragraphs.append(cleaned_para)
    
    return paragraphs

def concatenate_paragraphs(paragraphs, max_length):
    print(f"Creating chunks from paragraphs with  {max_length} max length")
    chunks = []
    current_chunk = ""
    
    for para in paragraphs:
        # Check if adding the next paragraph would exceed the max length
        is_overflow = max_length > 0 and len(current_chunk) + len(para) + 1 > max_length
        if current_chunk:
            current_chunk += "\n" + para
        else:
            current_chunk = para
        if is_overflow:
            chunks.append(current_chunk)
            current_chunk = ""
        
    # Add the last chunk
    if current_chunk:
        chunks.append(current_chunk)
    
    return chunks

def extract_chunks_from_docx(file_path, max_context_length=8000):
    paragraphs = extract_paragraphs_from_docx(file_path)
    chunks = concatenate_paragraphs(paragraphs, max_context_length)
    
    return chunks
