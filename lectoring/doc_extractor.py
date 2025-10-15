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
        cleaned = para.strip()
        if not cleaned:
            continue

        projected_len = len(current_chunk) + len(cleaned) + (1 if current_chunk else 0)
        if max_length > 0 and current_chunk and projected_len > max_length:
            chunks.append(current_chunk)
            current_chunk = cleaned
        else:
            current_chunk = cleaned if not current_chunk else f"{current_chunk}\n{cleaned}"

    if current_chunk:
        chunks.append(current_chunk)

    return chunks

def extract_chunks_from_docx(file_path, max_context_length=8000):
    paragraphs = extract_paragraphs_from_docx(file_path)
    chunks = concatenate_paragraphs(paragraphs, max_context_length)
    
    return chunks
