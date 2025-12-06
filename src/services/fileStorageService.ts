import { supabase } from '../lib/supabase';
import { DocumentType } from '../types';

/**
 * TODO: SECURITY - Production File Storage Requirements
 *
 * Current implementation stores files as base64 in the database, which is
 * NOT suitable for production due to:
 * 1. Database size bloat
 * 2. Performance issues with large files
 * 3. Lack of CDN support
 *
 * For production, implement one of these solutions:
 * 1. Supabase Storage (easiest):
 *    - Use supabase.storage.from('documents').upload()
 *    - Configure bucket policies for access control
 *
 * 2. AWS S3:
 *    - Use pre-signed URLs for secure uploads/downloads
 *    - Configure bucket policies and CORS
 *    - Enable server-side encryption (SSE-S3 or SSE-KMS)
 *
 * 3. Google Cloud Storage or Azure Blob Storage
 *
 * Security considerations:
 * - Scan uploaded files for malware
 * - Validate file types server-side (not just by extension)
 * - Set appropriate Content-Disposition headers
 * - Implement file size limits
 * - Use signed URLs with short expiration for downloads
 */

interface UploadedFile {
  id: string;
  application_id: string;
  document_type: DocumentType;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
}

/**
 * Sanitize file name to prevent path traversal and other attacks
 */
const sanitizeFileName = (fileName: string): string => {
  // Remove path separators and null bytes
  let sanitized = fileName.replace(/[\/\\:\*\?"<>\|\x00]/g, '_');
  // Remove leading dots (hidden files) and spaces
  sanitized = sanitized.replace(/^[\.\s]+/, '');
  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.split('.').pop() || '';
    sanitized = sanitized.substring(0, 255 - ext.length - 1) + '.' + ext;
  }
  // Fallback if empty
  return sanitized || 'unnamed_file';
};

export const fileStorageService = {
  /**
   * Upload a file for testing (stores as base64 in database)
   * In production with AWS, this would upload to S3/file server
   */
  async uploadApplicationDocument(
    applicationId: string,
    file: File,
    documentType: DocumentType
  ): Promise<UploadedFile> {
    try {
      // SECURITY: Sanitize file name to prevent path traversal attacks
      const safeFileName = sanitizeFileName(file.name);

      // Convert file to base64 for local storage
      const base64 = await this.fileToBase64(file);

      // Store in database (for testing - stores base64 data URL)
      const { data, error } = await supabase
        .from('application_documents')
        .insert({
          application_id: applicationId,
          document_type: documentType,
          file_name: safeFileName,
          file_url: base64, // In production, this would be S3 URL
          file_size: file.size,
          mime_type: file.type,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      // SECURITY: Don't expose internal error details
      if (import.meta.env.DEV) {
        console.error('Upload error:', error);
      }
      throw new Error('Failed to upload file. Please try again.');
    }
  },

  /**
   * Upload multiple files
   */
  async uploadMultipleDocuments(
    applicationId: string,
    files: Array<{ file: File; type: DocumentType }>
  ): Promise<UploadedFile[]> {
    const uploads = files.map(({ file, type }) =>
      this.uploadApplicationDocument(applicationId, file, type)
    );

    return Promise.all(uploads);
  },

  /**
   * Get all documents for an application
   */
  async getApplicationDocuments(applicationId: string): Promise<UploadedFile[]> {
    const { data, error } = await supabase
      .from('application_documents')
      .select('*')
      .eq('application_id', applicationId)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<void> {
    const { error } = await supabase
      .from('application_documents')
      .delete()
      .eq('id', documentId);

    if (error) throw error;
  },

  /**
   * Convert File to base64 data URL (for local testing)
   * In production, you'd upload to AWS S3/file server instead
   */
  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  },

  /**
   * Get human-readable file size
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  },

  /**
   * Validate file for upload
   */
  validateFile(file: File, maxSizeMB: number = 10): { valid: boolean; error?: string } {
    // Check file size
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return {
        valid: false,
        error: `File size must be less than ${maxSizeMB}MB`,
      };
    }

    // Check file type (allow common document types)
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file type. Please upload PDF, image, or document files.',
      };
    }

    return { valid: true };
  },

  /**
   * Get document type label
   */
  getDocumentTypeLabel(type: DocumentType): string {
    const labels: Record<DocumentType, string> = {
      id: 'ID / Driver\'s License',
      proof_of_income: 'Proof of Income',
      reference_letter: 'Reference Letter',
      credit_report: 'Credit Report',
      other: 'Other Document',
    };
    return labels[type] || type;
  },
};
