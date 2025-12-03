import { supabase } from '../lib/supabase';
import { DocumentType } from '../types';

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
      // Convert file to base64 for local storage
      const base64 = await this.fileToBase64(file);

      // Store in database (for testing - stores base64 data URL)
      const { data, error } = await supabase
        .from('application_documents')
        .insert({
          application_id: applicationId,
          document_type: documentType,
          file_name: file.name,
          file_url: base64, // In production, this would be S3 URL
          file_size: file.size,
          mime_type: file.type,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Upload error:', error);
      throw new Error('Failed to upload file: ' + (error instanceof Error ? error.message : 'Unknown error'));
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
