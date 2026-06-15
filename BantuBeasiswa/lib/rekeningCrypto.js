import crypto from 'crypto';

const REKENING_ENCRYPTION_PREFIX = 'enc:v1';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionSecret() {
  const secret =
    process.env.REKENING_ENCRYPTION_KEY ||
    process.env.BANK_ACCOUNT_ENCRYPTION_KEY ||
    process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('REKENING_ENCRYPTION_KEY belum di-set.');
  }

  return secret;
}

function getEncryptionKey() {
  return crypto.createHash('sha256').update(getEncryptionSecret()).digest();
}

function toBase64Url(buffer) {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(normalized + padding, 'base64');
}

export function isEncryptedRekeningNumber(value) {
  return typeof value === 'string' && value.startsWith(`${REKENING_ENCRYPTION_PREFIX}:`);
}

export function encryptRekeningNumber(value) {
  const plaintext = String(value ?? '').trim();
  if (!plaintext) return '';
  if (isEncryptedRekeningNumber(plaintext)) return plaintext;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    REKENING_ENCRYPTION_PREFIX,
    toBase64Url(iv),
    toBase64Url(authTag),
    toBase64Url(encrypted),
  ].join(':');
}

export function decryptRekeningNumber(value) {
  const raw = String(value ?? '').trim();
  if (!raw || !isEncryptedRekeningNumber(raw)) return raw;

  const parts = raw.split(':');
  if (parts.length !== 5) {
    throw new Error('Format nomor rekening terenkripsi tidak valid.');
  }

  const [, version, ivValue, authTagValue, encryptedValue] = parts;
  if (version !== 'v1') {
    throw new Error('Versi enkripsi nomor rekening tidak didukung.');
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    fromBase64Url(ivValue),
    { authTagLength: AUTH_TAG_LENGTH }
  );
  decipher.setAuthTag(fromBase64Url(authTagValue));

  return Buffer.concat([
    decipher.update(fromBase64Url(encryptedValue)),
    decipher.final(),
  ]).toString('utf8');
}

export function decryptRekeningNumberSafe(value) {
  try {
    return decryptRekeningNumber(value);
  } catch {
    return '';
  }
}

export function decryptRekeningRow(row) {
  if (!row) return row;

  const next = { ...row };
  if (Object.prototype.hasOwnProperty.call(next, 'nomorRekening')) {
    next.nomorRekening = decryptRekeningNumberSafe(next.nomorRekening);
  }
  if (Object.prototype.hasOwnProperty.call(next, 'nomor_rekening')) {
    next.nomor_rekening = decryptRekeningNumberSafe(next.nomor_rekening);
  }

  return next;
}
