from typing import List
import torch
from sentence_transformers import SentenceTransformer
import asyncio
import logging

logger = logging.getLogger(__name__)


class EmbeddingService:
    def __init__(self):
        """
        Initialize with local sentence transformer model (no API key required).
        Using all-MiniLM-L6-v2 - a fast, efficient model for semantic search.
        """
        try:
            # Use a lightweight, fast model that works well for RAG
            self.model_name = "all-MiniLM-L6-v2"
            logger.info(f"Loading embedding model: {self.model_name}")
            
            # Load model - this will download on first use (~90MB)
            self.model = SentenceTransformer(self.model_name)
            
            # Set device (CPU by default, will use GPU if available)
            device = 'cuda' if torch.cuda.is_available() else 'cpu'
            self.model = self.model.to(device)
            logger.info(f"Embedding model loaded on device: {device}")
            
        except Exception as e:
            logger.error(f"Failed to load embedding model: {str(e)}")
            raise Exception(f"Error initializing embedding service: {str(e)}")
    
    async def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for a list of texts using local sentence transformer model.
        """
        try:
            if not texts:
                return []
            
            # Run embedding generation in a thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            embeddings = await loop.run_in_executor(
                None, self._encode_texts, texts
            )
            
            # Convert to list of lists for consistency
            return embeddings.tolist()
            
        except Exception as e:
            logger.error(f"Error generating embeddings: {str(e)}")
            raise Exception(f"Error generating embeddings: {str(e)}")
    
    async def generate_single_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for a single text.
        """
        try:
            embeddings = await self.generate_embeddings([text])
            return embeddings[0]
            
        except Exception as e:
            logger.error(f"Error generating single embedding: {str(e)}")
            raise Exception(f"Error generating embedding: {str(e)}")
    
    def _encode_texts(self, texts: List[str]):
        """
        Synchronous method to encode texts (runs in thread pool).
        """
        try:
            # Encode texts to embeddings
            embeddings = self.model.encode(
                texts,
                batch_size=32,  # Process in batches for efficiency
                show_progress_bar=False,
                convert_to_tensor=False,
                normalize_embeddings=True  # Important for similarity search
            )
            return embeddings
            
        except Exception as e:
            logger.error(f"Error in _encode_texts: {str(e)}")
            raise e
    
    def get_model_info(self) -> dict:
        """
        Get information about the embedding model.
        """
        return {
            "model_name": self.model_name,
            "embedding_dimension": self.model.get_sentence_embedding_dimension(),
            "max_sequence_length": self.model.max_seq_length,
            "device": str(self.model.device)
        }