import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { Brain, FileText, MessageSquare, Settings } from 'lucide-react';
import DocumentUpload from './components/DocumentUpload';
import DocumentList from './components/DocumentList';
import ChatInterface from './components/ChatInterface';
import { useDocuments } from './hooks/useDocuments';
import { Document } from './types';
import './App.css';

function App() {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'documents' | 'chat'>('documents');
  
  const {
    documents,
    loading,
    error,
    uploadDocument,
    deleteDocument,
    updateDocument,
  } = useDocuments();

  const handleDocumentSelect = (document: Document) => {
    setSelectedDocument(document);
    setActiveTab('chat');
  };

  const handleUpload = async (file: File, onProgress?: (progress: number) => void) => {
    const uploadedDocument = await uploadDocument(file, onProgress);
    if (uploadedDocument) {
      // Auto-select the uploaded document when it's ready
      if (uploadedDocument.processing_status === 'completed') {
        setSelectedDocument(uploadedDocument);
        setActiveTab('chat');
      }
    }
    return uploadedDocument;
  };

  const handleDelete = async (id: number) => {
    const success = await deleteDocument(id);
    if (success && selectedDocument?.id === id) {
      setSelectedDocument(null);
      setActiveTab('documents');
    }
  };

  const getTabContent = () => {
    switch (activeTab) {
      case 'upload':
        return (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Upload Document</h2>
              <p className="mt-2 text-gray-600">
                Upload a PDF, DOCX, DOC, or TXT file to start asking questions
              </p>
            </div>
            <DocumentUpload onUpload={handleUpload} />
          </div>
        );
      
      case 'documents':
        return (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Documents</h2>
                <p className="mt-1 text-gray-600">
                  Manage your uploaded documents
                </p>
              </div>
              <button
                onClick={() => setActiveTab('upload')}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                Upload New
              </button>
            </div>
            
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600">{error}</p>
              </div>
            )}
            
            <DocumentList
              documents={documents}
              selectedDocument={selectedDocument}
              onDocumentSelect={handleDocumentSelect}
              onDocumentDelete={handleDelete}
              loading={loading}
            />
          </div>
        );
      
      case 'chat':
        return (
          <div className="h-full">
            <ChatInterface document={selectedDocument} />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Brain className="h-8 w-8 text-primary-500" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  AI Document Q&A
                </h1>
                <p className="text-sm text-gray-500">
                  Upload documents and ask questions
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                {documents.length} document{documents.length !== 1 ? 's' : ''}
              </span>
              {selectedDocument && (
                <span className="text-sm text-primary-600 font-medium">
                  • {selectedDocument.original_filename}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-8rem)]">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('documents')}
                className={`
                  w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors
                  ${activeTab === 'documents'
                    ? 'bg-primary-100 text-primary-700 border border-primary-200'
                    : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <FileText className="h-5 w-5" />
                <span>Documents</span>
                <span className="ml-auto text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                  {documents.length}
                </span>
              </button>
              
              <button
                onClick={() => setActiveTab('upload')}
                className={`
                  w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors
                  ${activeTab === 'upload'
                    ? 'bg-primary-100 text-primary-700 border border-primary-200'
                    : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <Settings className="h-5 w-5" />
                <span>Upload</span>
              </button>
              
              <button
                onClick={() => setActiveTab('chat')}
                disabled={!selectedDocument}
                className={`
                  w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors
                  ${activeTab === 'chat'
                    ? 'bg-primary-100 text-primary-700 border border-primary-200'
                    : selectedDocument
                    ? 'text-gray-700 hover:bg-gray-100'
                    : 'text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                <MessageSquare className="h-5 w-5" />
                <span>Chat</span>
                {selectedDocument && (
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                )}
              </button>
            </nav>
            
            {/* Quick Stats */}
            <div className="mt-8 p-4 bg-white rounded-lg border">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Documents</span>
                  <span className="font-medium">{documents.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Ready for Chat</span>
                  <span className="font-medium">
                    {documents.filter(d => d.processing_status === 'completed').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Processing</span>
                  <span className="font-medium">
                    {documents.filter(d => d.processing_status === 'processing').length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className={`h-full ${activeTab === 'chat' ? '' : 'overflow-y-auto'}`}>
              {getTabContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
