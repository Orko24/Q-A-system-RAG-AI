import React, { useState, useRef } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Document } from '../types';

interface DocumentUploadProps {
  onUpload: (file: File, onProgress?: (progress: number) => void) => Promise<Document | null>;
  disabled?: boolean;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ onUpload, disabled = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [processingPhase, setProcessingPhase] = useState<'upload' | 'processing' | 'complete' | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supportedTypes = ['pdf', 'docx', 'doc', 'txt'];
  const maxSize = 50 * 1024 * 1024; // 50MB

  const validateFile = (file: File): string | null => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (!extension || !supportedTypes.includes(extension)) {
      return `Unsupported file type. Supported types: ${supportedTypes.join(', ')}`;
    }
    
    if (file.size > maxSize) {
      return `File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`;
    }
    
    return null;
  };

  const handleFileUpload = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      alert(validationError);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setProcessingPhase('upload');
    setCurrentFileName(file.name);

    try {
      const uploadedDoc = await onUpload(file, (progress) => {
        setUploadProgress(progress);
      });
      
      if (uploadedDoc) {
        setProcessingPhase('processing');
        setUploadProgress(100);
        
        // Show processing phase for a few seconds, then complete
        setTimeout(() => {
          setProcessingPhase('complete');
          setTimeout(() => {
            setProcessingPhase(null);
            setIsUploading(false);
            setUploadProgress(null);
            setCurrentFileName('');
          }, 2000);
        }, 1000);
      }
    } catch (error: any) {
      setIsUploading(false);
      setUploadProgress(null);
      setProcessingPhase(null);
      setCurrentFileName('');
      
      // Show specific error message for file size issues
      if (error?.response?.status === 413) {
        alert(`File too large! The file "${file.name}" exceeds the 50MB limit. Please choose a smaller file.`);
      } else if (error?.message?.includes('file size')) {
        alert(`File too large! Maximum size allowed is 50MB.`);
      } else {
        alert(`Upload failed: ${error?.message || 'Unknown error'}`);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled || isUploading) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
    // Reset input value to allow re-uploading the same file
    e.target.value = '';
  };

  const openFileDialog = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
          ${isDragging 
            ? 'border-primary-500 bg-primary-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${disabled || isUploading 
            ? 'opacity-50 cursor-not-allowed' 
            : 'cursor-pointer hover:bg-gray-50'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx,.doc,.txt"
          onChange={handleFileSelect}
          disabled={disabled || isUploading}
        />

        {isUploading ? (
          <div className="space-y-4">
            {processingPhase === 'complete' ? (
              <CheckCircle className="mx-auto w-8 h-8 text-green-500" />
            ) : (
              <div className="animate-spin mx-auto w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full"></div>
            )}
            
            <div>
              <p className="text-sm font-medium text-gray-900">
                {processingPhase === 'upload' && 'Uploading...'}
                {processingPhase === 'processing' && 'Processing document...'}
                {processingPhase === 'complete' && 'Ready for Q&A!'}
              </p>
              
              {currentFileName && (
                <p className="text-xs text-gray-500 mt-1 truncate">{currentFileName}</p>
              )}
              
              {uploadProgress !== null && processingPhase !== 'complete' && (
                <div className="mt-2">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {processingPhase === 'upload' ? `${uploadProgress}%` : 'Extracting text and generating embeddings...'}
                  </p>
                </div>
              )}
              
              {processingPhase === 'processing' && (
                <div className="mt-2">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full animate-pulse"></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Creating searchable index...</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div>
              <p className="text-lg font-medium text-gray-900">
                Drop your document here, or <span className="text-primary-600">browse</span>
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Supports PDF, DOCX, DOC, and TXT files up to 50MB
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <div className="flex items-center justify-center space-x-4">
          <span className="flex items-center">
            <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
            Secure upload
          </span>
          <span className="flex items-center">
            <File className="h-4 w-4 text-blue-500 mr-1" />
            Auto-processing
          </span>
          <span className="flex items-center">
            <AlertCircle className="h-4 w-4 text-orange-500 mr-1" />
            Max 50MB
          </span>
        </div>
      </div>
    </div>
  );
};

export default DocumentUpload;
