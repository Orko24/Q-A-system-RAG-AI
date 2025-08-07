import os
import uuid
from typing import List, Tuple
import PyPDF2
from docx import Document as DocxDocument
from io import BytesIO
import re

from app.core.config import settings


class DocumentProcessor:
    def __init__(self):
        self.chunk_size = settings.CHUNK_SIZE
        self.chunk_overlap = settings.CHUNK_OVERLAP
    
    def extract_text(self, file_content: bytes, file_type: str) -> str:
        """Extract text from various file formats."""
        try:
            if file_type.lower() == 'pdf':
                return self._extract_pdf_text(file_content)
            elif file_type.lower() in ['docx', 'doc']:
                return self._extract_docx_text(file_content)
            elif file_type.lower() == 'txt':
                return file_content.decode('utf-8')
            else:
                raise ValueError(f"Unsupported file type: {file_type}")
        except Exception as e:
            raise Exception(f"Error extracting text: {str(e)}")
    
    def _extract_pdf_text(self, file_content: bytes) -> str:
        """Extract text from PDF file."""
        pdf_reader = PyPDF2.PdfReader(BytesIO(file_content))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    
    def _extract_docx_text(self, file_content: bytes) -> str:
        """Extract text from DOCX file."""
        doc = DocxDocument(BytesIO(file_content))
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text.strip()
    
    def create_chunks(self, text: str) -> List[str]:
        """
        Split text into overlapping chunks while trying to preserve sentence boundaries.
        """
        if not text.strip():
            return []
        
        # Clean and normalize text
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Split into sentences (basic approach)
        sentences = re.split(r'(?<=[.!?])\s+', text)
        
        chunks = []
        current_chunk = ""
        
        for sentence in sentences:
            # If adding this sentence would exceed chunk size
            if len(current_chunk) + len(sentence) > self.chunk_size:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                    
                    # Start new chunk with overlap
                    overlap_text = self._get_overlap_text(current_chunk)
                    current_chunk = overlap_text + " " + sentence if overlap_text else sentence
                else:
                    # Single sentence is longer than chunk size, split it
                    chunks.extend(self._split_long_sentence(sentence))
                    current_chunk = ""
            else:
                current_chunk += " " + sentence if current_chunk else sentence
        
        # Add the last chunk
        if current_chunk.strip():
            chunks.append(current_chunk.strip())
        
        return [chunk for chunk in chunks if chunk.strip()]
    
    def _get_overlap_text(self, text: str) -> str:
        """Get the last portion of text for overlap."""
        if len(text) <= self.chunk_overlap:
            return text
        
        # Try to find sentence boundary for overlap
        overlap_text = text[-self.chunk_overlap:]
        sentence_start = overlap_text.find('. ')
        if sentence_start != -1:
            return overlap_text[sentence_start + 2:]
        
        return overlap_text
    
    def _split_long_sentence(self, sentence: str) -> List[str]:
        """Split a sentence that's longer than chunk size."""
        words = sentence.split()
        chunks = []
        current_chunk = ""
        
        for word in words:
            if len(current_chunk) + len(word) + 1 > self.chunk_size:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                    current_chunk = word
                else:
                    # Single word is longer than chunk size
                    chunks.append(word)
            else:
                current_chunk += " " + word if current_chunk else word
        
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        return chunks
    
    def save_file(self, file_content: bytes, filename: str) -> str:
        """Save uploaded file to disk and return the file path."""
        # Create upload directory if it doesn't exist
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        
        # Generate unique filename
        file_id = str(uuid.uuid4())
        file_extension = os.path.splitext(filename)[1]
        unique_filename = f"{file_id}{file_extension}"
        file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
        
        # Save file
        with open(file_path, 'wb') as f:
            f.write(file_content)
        
        return file_path
    
    def delete_file(self, file_path: str) -> bool:
        """Delete a file from disk."""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                return True
            return False
        except Exception:
            return False
