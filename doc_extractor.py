from docx import Document

def extract_paragraphs_from_docx(file_path):
    # Load the document
    doc = Document(file_path)
    paragraphs = [para.text for para in doc.paragraphs if para.text.strip() != ""]
    return paragraphs

def concatenate_paragraphs(paragraphs, max_length):
    chunks = []
    current_chunk = ""
    
    for para in paragraphs:
        # Check if adding the next paragraph would exceed the max length
        if len(current_chunk) + len(para) + 1 > max_length:
            chunks.append(current_chunk)
            current_chunk = para
        else:
            if current_chunk:
                current_chunk += "\n" + para
            else:
                current_chunk = para
    
    # Add the last chunk
    if current_chunk:
        chunks.append(current_chunk)
    
    return chunks

def main(file_path, max_context_length=8000):
    paragraphs = extract_paragraphs_from_docx(file_path)
    chunks = concatenate_paragraphs(paragraphs, max_context_length)
    
    return chunks

# Example usage
if __name__ == "__main__":
    file_path = "backend.docx"  # Replace with your .docx file path
    chunks = main(file_path)
    print(len(chunks))
    # output chunks[0] in a file
    with open("output.txt", "w") as f:
        f.write(chunks[0])
    
