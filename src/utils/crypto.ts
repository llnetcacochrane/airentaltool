/**
 * Cryptographic utilities for secure data handling
 *
 * SECURITY NOTE: This implements client-side encryption for API keys before
 * storing in the database. The encryption key should be stored securely
 * (e.g., in environment variables or a key management service).
 *
 * For production use, consider using a dedicated key management service like:
 * - AWS KMS
 * - Google Cloud KMS
 * - HashiCorp Vault
 */

// Encryption key derivation from a passphrase
// In production, this should come from a secure key management system
const getEncryptionKey = async (): Promise<CryptoKey> => {
  // Use a combination of a static salt and any available entropy
  // TODO: In production, use a proper key management service (AWS KMS, Vault, etc.)
  const keyMaterial = import.meta.env.VITE_ENCRYPTION_KEY || 'default-dev-key-change-in-production';

  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyMaterial);

  // Import the raw key material
  const baseKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive an AES-GCM key using PBKDF2
  const salt = encoder.encode('airental-tools-salt-v1');
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

/**
 * Encrypt a string value using AES-GCM
 * Returns a base64-encoded string containing the IV and ciphertext
 */
export const encryptValue = async (plaintext: string): Promise<string> => {
  try {
    const key = await getEncryptionKey();
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    // Generate a random IV for each encryption
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    // Combine IV and ciphertext, then base64 encode
    const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt sensitive data');
  }
};

/**
 * Decrypt a base64-encoded encrypted value
 */
export const decryptValue = async (encrypted: string): Promise<string> => {
  try {
    const key = await getEncryptionKey();

    // Decode base64 and extract IV and ciphertext
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt sensitive data');
  }
};

/**
 * Check if a value appears to be encrypted (base64 encoded with proper length)
 */
export const isEncrypted = (value: string): boolean => {
  try {
    // Encrypted values are base64 and should decode to at least 12 bytes (IV) + some ciphertext
    const decoded = atob(value);
    return decoded.length >= 28; // 12 bytes IV + at least 16 bytes ciphertext
  } catch {
    return false;
  }
};

/**
 * Mask a sensitive value for display (show first/last few chars)
 */
export const maskSensitiveValue = (value: string, showChars: number = 4): string => {
  if (!value || value.length <= showChars * 2) {
    return '********';
  }
  const start = value.substring(0, showChars);
  const end = value.substring(value.length - showChars);
  return `${start}${'*'.repeat(8)}${end}`;
};

/**
 * Generate a cryptographically secure random string
 */
export const generateSecureToken = (length: number = 32): string => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Generate a secure invitation code (alphanumeric, easy to type)
 */
export const generateSecureInvitationCode = (length: number = 12): string => {
  // Use only unambiguous characters (no 0/O, 1/l/I confusion)
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => charset[byte % charset.length]).join('');
};
