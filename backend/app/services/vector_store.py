import chromadb
from chromadb.config import Settings as ChromaSettings
from typing import List, Dict, Any, Optional
import json
import os

from app.core.config import settings


class VectorStore:
    def __init__(self):
        # Create ChromaDB directory if it doesn't exist
        os.makedirs(settings.CHROMA_DB_PATH, exist_ok=True)
        
        # Initialize ChromaDB client
        self.client = chromadb.PersistentClient(
            path=settings.CHROMA_DB_PATH,
            settings=ChromaSettings(anonymized_telemetry=False)
        )
        
        # Get or create collection
        self.collection = self.client.get_or_create_collection(
            name="documents",
            metadata={"description": "Document chunks for RAG system"}
        )
    
    def add_document_chunks(
        self, 
        document_id: int, 
        chunks: List[str], 
        embeddings: List[List[float]]
    ) -> bool:
        """
        Add document chunks with their embeddings to the vector store.
        """
        try:
            if len(chunks) != len(embeddings):
                raise ValueError("Number of chunks must match number of embeddings")
            
            # Create unique IDs for each chunk
            chunk_ids = [f"doc_{document_id}_chunk_{i}" for i in range(len(chunks))]
            
            # Create metadata for each chunk
            metadatas = [
                {
                    "document_id": document_id,
                    "chunk_index": i,
                    "chunk_length": len(chunk)
                }
                for i, chunk in enumerate(chunks)
            ]
            
            # Add to ChromaDB
            self.collection.add(
                documents=chunks,
                embeddings=embeddings,
                ids=chunk_ids,
                metadatas=metadatas
            )
            
            return True
            
        except Exception as e:
            raise Exception(f"Error adding document chunks: {str(e)}")
    
    def similarity_search(
        self, 
        query_embedding: List[float], 
        document_id: Optional[int] = None, 
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Perform similarity search to find relevant chunks.
        """
        try:
            # Build where clause for filtering by document
            where_clause = None
            if document_id is not None:
                where_clause = {"document_id": document_id}
            
            # Perform search
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                where=where_clause,
                include=["documents", "metadatas", "distances"]
            )
            
            # Format results
            formatted_results = []
            if results['documents'] and results['documents'][0]:
                for i, (doc, metadata, distance) in enumerate(zip(
                    results['documents'][0],
                    results['metadatas'][0],
                    results['distances'][0]
                )):
                    formatted_results.append({
                        "content": doc,
                        "metadata": metadata,
                        "score": 1 - distance,  # Convert distance to similarity score
                        "distance": distance
                    })
            
            return formatted_results
            
        except Exception as e:
            raise Exception(f"Error performing similarity search: {str(e)}")
    
    def delete_document(self, document_id: int) -> bool:
        """
        Delete all chunks for a specific document.
        """
        try:
            # Find all chunk IDs for this document
            results = self.collection.get(
                where={"document_id": document_id},
                include=["metadatas"]
            )
            
            if results['ids']:
                # Delete all chunks for this document
                self.collection.delete(ids=results['ids'])
            
            return True
            
        except Exception as e:
            raise Exception(f"Error deleting document: {str(e)}")
    
    def get_collection_info(self) -> Dict[str, Any]:
        """
        Get information about the vector store collection.
        """
        try:
            count = self.collection.count()
            return {
                "total_chunks": count,
                "collection_name": self.collection.name
            }
        except Exception as e:
            raise Exception(f"Error getting collection info: {str(e)}")
    
    def health_check(self) -> bool:
        """
        Check if the vector store is healthy.
        """
        try:
            self.collection.count()
            return True
        except Exception:
            return False
