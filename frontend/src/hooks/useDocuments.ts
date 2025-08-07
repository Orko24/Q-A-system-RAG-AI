import { useState, useEffect } from 'react';
import { Document } from '../types';
import { documentAPI } from '../services/api';
import toast from 'react-hot-toast';

export const useDocuments = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const docs = await documentAPI.list();
      setDocuments(docs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch documents';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (file: File, onProgress?: (progress: number) => void): Promise<Document | null> => {
    try {
      const document = await documentAPI.upload(file, onProgress);
      setDocuments(prev => [document, ...prev]);
      toast.success(`Successfully uploaded ${file.name}`);
      
      // Start polling for processing status updates
      pollDocumentStatus(document.id);
      
      return document;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload document';
      toast.error(errorMessage);
      return null;
    }
  };

  const pollDocumentStatus = async (documentId: number) => {
    const pollInterval = setInterval(async () => {
      try {
        const status = await documentAPI.getStatus(documentId);
        
        // Update the document in the list
        setDocuments(prev => 
          prev.map(doc => 
            doc.id === documentId 
              ? { 
                  ...doc, 
                  processing_status: status.status as 'pending' | 'processing' | 'completed' | 'failed', 
                  total_chunks: status.total_chunks, 
                  error_message: status.error_message 
                }
              : doc
          )
        );
        
        // Stop polling when processing is complete or failed
        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(pollInterval);
          
          if (status.status === 'completed') {
            toast.success('Document processing completed!');
          } else if (status.status === 'failed') {
            toast.error(`Document processing failed: ${status.error_message}`);
          }
        }
      } catch (error) {
        console.error('Error polling document status:', error);
        clearInterval(pollInterval);
      }
    }, 2000); // Poll every 2 seconds
    
    // Stop polling after 5 minutes to prevent infinite polling
    setTimeout(() => clearInterval(pollInterval), 300000);
  };

  const deleteDocument = async (id: number): Promise<boolean> => {
    try {
      await documentAPI.delete(id);
      setDocuments(prev => prev.filter(doc => doc.id !== id));
      toast.success('Document deleted successfully');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete document';
      toast.error(errorMessage);
      return false;
    }
  };

  const updateDocument = (updatedDoc: Document) => {
    setDocuments(prev => 
      prev.map(doc => doc.id === updatedDoc.id ? updatedDoc : doc)
    );
  };

  const getDocument = (id: number): Document | undefined => {
    return documents.find(doc => doc.id === id);
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  return {
    documents,
    loading,
    error,
    fetchDocuments,
    uploadDocument,
    deleteDocument,
    updateDocument,
    getDocument,
    pollDocumentStatus,
  };
};
