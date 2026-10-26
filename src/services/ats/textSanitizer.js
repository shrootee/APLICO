/**
 * PII Sanitizer for Resume Data
 * Masks sensitive personal contact information (email, phone, address, social links)
 * before any AI processing or network requests.
 */

export function sanitizeResumeText(text = '') {
  if (typeof text !== 'string') return '';

  let sanitized = text;

  // Mask Email Addresses
  sanitized = sanitized.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
    '[EMAIL_PROTECTED]'
  );

  // Mask Phone numbers (international, US, Indian 10-digit formats)
  sanitized = sanitized.replace(
    /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    '[PHONE_PROTECTED]'
  );
  sanitized = sanitized.replace(
    /(?:\+91[\s-]?)?[6789]\d{9}\b/g,
    '[PHONE_PROTECTED]'
  );

  // Mask Physical Address patterns (Street, Road, Apt, Suite, Pin/Zip codes)
  sanitized = sanitized.replace(
    /\b\d{1,5}\s+[A-Za-z0-9\s,.-]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Apartment|Apt|Suite)\b[^\n]*/gi,
    '[ADDRESS_PROTECTED]'
  );

  return sanitized;
}

/**
 * Generate a SHA-256 hash or fast string hash of normalized text for caching.
 */
export function hashText(str = '') {
  const norm = str.trim().toLowerCase().replace(/\s+/g, ' ');
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    const char = norm.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}
