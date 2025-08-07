import React, { useState } from 'react';
import { FileText, Trash2, MessageCircle, Clock, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { Document } from '../types';

interface DocumentListProps {
  documents: Document[];
  selectedDocument: Document | null;
  onDocumentSelect: (document: Document) => void;
  onDocumentDelete: (id: number) => void;
  loading?: boolean;
}

const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  selectedDocument,
  onDocumentSelect,
  onDocumentDelete,
  loading = false
}) => {
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Loader className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Ready';
      case 'processing':
        return 'Processing...';
      case 'failed':
        return 'Failed';
      default:
        return 'Pending';
    }
  };

  const handleDelete = (id: number) => {
    if (deleteConfirm === id) {
      onDocumentDelete(id);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000); // Auto-cancel after 3 seconds
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 rounded-lg h-20 w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
        <p className="mt-1 text-sm text-gray-500">
          Upload a document to get started with Q&A
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((document) => (
        <div
          key={document.id}
          className={`
            relative border rounded-lg p-4 cursor-pointer transition-all duration-200
            ${selectedDocument?.id === document.id
              ? 'border-primary-500 bg-primary-50 shadow-md'
              : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
            }
            ${document.processing_status !== 'completed' ? 'opacity-75' : ''}
          `}
          onClick={() => {
            if (document.processing_status === 'completed') {
              onDocumentSelect(document);
            }
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1 min-w-0">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-gray-400" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {document.original_filename}
                </h3>
                
                <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                  <span>{formatFileSize(document.file_size)}</span>
                  <span>{document.file_type.toUpperCase()}</span>
                  <span>{formatDate(document.upload_date)}</span>
                </div>
                
                <div className="mt-2 flex items-center space-x-2">
                  {getStatusIcon(document.processing_status)}
                  <span className={`text-xs font-medium ${
                    document.processing_status === 'completed' ? 'text-green-600' :
                    document.processing_status === 'processing' ? 'text-blue-600' :
                    document.processing_status === 'failed' ? 'text-red-600' :
                    'text-yellow-600'
                  }`}>
                    {getStatusText(document.processing_status)}
                  </span>
                  
                  {document.processing_status === 'completed' && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span className="text-xs text-gray-500">
                        {document.total_chunks} chunks
                      </span>
                    </>
                  )}
                </div>
                
                {document.error_message && (
                  <p className="mt-1 text-xs text-red-600 truncate">
                    {document.error_message}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2 ml-4">
              {document.processing_status === 'completed' && selectedDocument?.id === document.id && (
                <MessageCircle className="h-4 w-4 text-primary-500" />
              )}
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(document.id);
                }}
                className={`
                  p-1 rounded hover:bg-gray-100 transition-colors
                  ${deleteConfirm === document.id 
                    ? 'text-red-600 bg-red-50' 
                    : 'text-gray-400 hover:text-red-500'
                  }
                `}
                title={deleteConfirm === document.id ? 'Click again to confirm' : 'Delete document'}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          {deleteConfirm === document.id && (
            <div className="absolute inset-0 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center">
              <p className="text-sm text-red-600 font-medium">
                Click delete again to confirm
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default DocumentList;
