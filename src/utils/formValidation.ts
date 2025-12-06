/**
 * Form Validation Utilities
 *
 * TODO: SECURITY - Server-Side Validation Required
 *
 * These validations are CLIENT-SIDE only and should NOT be relied upon
 * for security. All validation must be duplicated server-side:
 *
 * 1. Password requirements should be enforced in Supabase auth config
 *    and/or edge functions
 * 2. Email format validation should be done server-side before sending
 * 3. Input sanitization must happen server-side to prevent XSS/injection
 *
 * Current password requirements (implement server-side too):
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - Consider requiring special characters for admin accounts
 */

// Form validation utilities

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone validation regex (accepts various formats)
const PHONE_REGEX = /^[\d\s\-\+\(\)]{7,20}$/;

// Canadian postal code regex
const CA_POSTAL_REGEX = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;

// US zip code regex
const US_ZIP_REGEX = /^\d{5}(-\d{4})?$/;

export const validators = {
  required: (value: any, fieldName: string): ValidationError | null => {
    if (value === undefined || value === null || value === '' || (typeof value === 'string' && value.trim() === '')) {
      return { field: fieldName, message: `${fieldName} is required` };
    }
    return null;
  },

  minLength: (value: string, min: number, fieldName: string): ValidationError | null => {
    if (value && value.trim().length < min) {
      return { field: fieldName, message: `${fieldName} must be at least ${min} characters` };
    }
    return null;
  },

  maxLength: (value: string, max: number, fieldName: string): ValidationError | null => {
    if (value && value.length > max) {
      return { field: fieldName, message: `${fieldName} must be no more than ${max} characters` };
    }
    return null;
  },

  email: (value: string, fieldName: string = 'Email'): ValidationError | null => {
    if (value && !EMAIL_REGEX.test(value)) {
      return { field: fieldName, message: `Please enter a valid email address` };
    }
    return null;
  },

  phone: (value: string, fieldName: string = 'Phone'): ValidationError | null => {
    if (value && !PHONE_REGEX.test(value)) {
      return { field: fieldName, message: `Please enter a valid phone number` };
    }
    return null;
  },

  postalCode: (value: string, country: string, fieldName: string = 'Postal Code'): ValidationError | null => {
    if (!value) return null;

    if (country === 'CA' && !CA_POSTAL_REGEX.test(value)) {
      return { field: fieldName, message: `Please enter a valid Canadian postal code (e.g., A1A 1A1)` };
    }
    if (country === 'US' && !US_ZIP_REGEX.test(value)) {
      return { field: fieldName, message: `Please enter a valid US zip code (e.g., 12345 or 12345-6789)` };
    }
    return null;
  },

  min: (value: number | string, min: number, fieldName: string): ValidationError | null => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (!isNaN(numValue) && numValue < min) {
      return { field: fieldName, message: `${fieldName} must be at least ${min}` };
    }
    return null;
  },

  max: (value: number | string, max: number, fieldName: string): ValidationError | null => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (!isNaN(numValue) && numValue > max) {
      return { field: fieldName, message: `${fieldName} must be no more than ${max}` };
    }
    return null;
  },

  range: (value: number | string, min: number, max: number, fieldName: string): ValidationError | null => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (!isNaN(numValue) && (numValue < min || numValue > max)) {
      return { field: fieldName, message: `${fieldName} must be between ${min} and ${max}` };
    }
    return null;
  },

  yearBuilt: (value: string, fieldName: string = 'Year Built'): ValidationError | null => {
    if (!value) return null;
    const year = parseInt(value);
    const currentYear = new Date().getFullYear();
    if (isNaN(year) || year < 1800 || year > currentYear + 5) {
      return { field: fieldName, message: `Year must be between 1800 and ${currentYear + 5}` };
    }
    return null;
  },

  positive: (value: number | string, fieldName: string): ValidationError | null => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (!isNaN(numValue) && numValue < 0) {
      return { field: fieldName, message: `${fieldName} cannot be negative` };
    }
    return null;
  },

  dateInFuture: (value: string, fieldName: string): ValidationError | null => {
    if (!value) return null;
    const date = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      return { field: fieldName, message: `${fieldName} must be in the future` };
    }
    return null;
  },

  dateInPast: (value: string, fieldName: string): ValidationError | null => {
    if (!value) return null;
    const date = new Date(value);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (date > today) {
      return { field: fieldName, message: `${fieldName} cannot be in the future` };
    }
    return null;
  },

  custom: (value: any, validator: (value: any) => boolean, fieldName: string, message: string): ValidationError | null => {
    if (!validator(value)) {
      return { field: fieldName, message };
    }
    return null;
  },
};

// Helper to run multiple validations
export function validate(validations: (ValidationError | null)[]): ValidationResult {
  const errors = validations.filter((error): error is ValidationError => error !== null);
  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Helper to get error message for a specific field
export function getFieldError(errors: ValidationError[], fieldName: string): string | undefined {
  return errors.find(e => e.field === fieldName)?.message;
}

// Input field styling based on error state
export function getInputClassName(hasError: boolean, baseClass: string = ''): string {
  const base = baseClass || 'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition';
  return hasError
    ? `${base} border-red-300 focus:ring-red-500 bg-red-50`
    : `${base} border-gray-300 focus:ring-blue-500`;
}

// Error message component props helper
export interface FieldErrorProps {
  error?: string;
  className?: string;
}
