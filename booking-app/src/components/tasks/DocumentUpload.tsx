'use client';

import { useState, useRef } from 'react';
import { useTaskCompat } from '@/hooks/compat/useTaskCompat';
import { Upload, X, FileText, Image as ImageIcon, File, CheckCircle } from 'lucide-react';

interface DocumentUploadProps {
  taskId: string;
  onUploadComplete?: () => void;
}

export function DocumentUpload({ taskId, onUploadComplete }: DocumentUploadProps) {
  const { addAttachment, getAttachmentsByTask, completeTask } = useTaskCompat();
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const attachments = getAttachmentsByTask(taskId);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    handleFiles(files);
  };

  const handleFiles = async (files: File[]) => {
    setUploading(true);

    for (const file of files) {
      try {
        // Convert file to base64 for storage
        const base64 = await fileToBase64(file);

        // Add attachment to store
        addAttachment({
          taskId,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          fileData: base64,
          uploadedBy: 'current-user', // TODO: Get from auth store
          uploadedByName: 'Current User',
          documentType: inferDocumentType(file.name),
        });

        console.log('✅ [Document Upload] Uploaded:', file.name);
      } catch (error) {
        console.error('❌ [Document Upload] Failed:', file.name, error);
        alert(`Failed to upload ${file.name}`);
      }
    }

    setUploading(false);
    onUploadComplete?.();
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const inferDocumentType = (
    fileName: string
  ): 'booking_confirmation' | 'invoice' | 'voucher' | 'receipt' | 'correspondence' | 'other' => {
    const lower = fileName.toLowerCase();
    if (lower.includes('confirmation') || lower.includes('booking')) {
      return 'booking_confirmation';
    }
    if (lower.includes('invoice')) {
      return 'invoice';
    }
    if (lower.includes('voucher')) {
      return 'voucher';
    }
    if (lower.includes('receipt')) {
      return 'receipt';
    }
    return 'other';
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon className="w-8 h-8 text-blue-500" />;
    }
    if (fileType === 'application/pdf') {
      return <FileText className="w-8 h-8 text-red-500" />;
    }
    return <File className="w-8 h-8 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleCompleteTask = () => {
    if (attachments.length > 0) {
      completeTask(taskId, `Uploaded ${attachments.length} document(s)`);
      onUploadComplete?.();
    } else {
      alert('Please upload at least one document before completing');
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInput}
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        />

        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />

        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Upload Booking Confirmation
        </h3>

        <p className="text-sm text-gray-600 mb-4">
          Drag and drop files here, or click to select
        </p>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Uploading...' : 'Select Files'}
        </button>

        <p className="text-xs text-gray-500 mt-2">
          Supported: PDF, JPG, PNG, DOC (Max 10MB per file)
        </p>
      </div>

      {/* Uploaded Files List */}
      {attachments.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900">Uploaded Documents</h4>

          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg"
            >
              {/* File Icon */}
              <div className="flex-shrink-0">{getFileIcon(attachment.fileType)}</div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {attachment.fileName}
                </p>
                <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                  <span>{formatFileSize(attachment.fileSize)}</span>
                  <span>•</span>
                  <span className="capitalize">
                    {attachment.documentType?.replace('_', ' ')}
                  </span>
                  <span>•</span>
                  <span>
                    {new Date(attachment.uploadedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Preview/Download */}
              {attachment.fileData && (
                <a
                  href={attachment.fileData}
                  download={attachment.fileName}
                  className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded hover:bg-blue-50"
                >
                  Download
                </a>
              )}
            </div>
          ))}

          {/* Complete Task Button */}
          <button
            onClick={handleCompleteTask}
            className="w-full mt-4 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center gap-2 font-semibold"
          >
            <CheckCircle className="w-5 h-5" />
            Complete Task with {attachments.length} Document(s)
          </button>
        </div>
      )}
    </div>
  );
}
