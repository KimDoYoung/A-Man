/**
 * Base64 string to Uint8Array helper
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const normalized = base64.replace(/-/g, '+').replace(/_/g, '/');
  const binaryString = atob(normalized);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derives a CryptoKey from a string password/key using SHA-256
 */
async function importKey(keyStr: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyStr);
  const hash = await crypto.subtle.digest('SHA-256', keyData);
  return crypto.subtle.importKey(
    'raw',
    hash,
    { name: 'AES-CBC' },
    false,
    ['encrypt', 'decrypt']
  );
}

// 이 키는 백엔드의 SecurityUtil.STATIC_CLIENT_KEY와 대칭되는 정적 키입니다.
// 빌드/배포 시 난독화에 의해 보호됩니다.
export const STATIC_CLIENT_KEY = "A-Man-Static-Client-Key-2026!";

/**
 * Decrypts AES-CBC encrypted base64 payload where the first 16 bytes are the IV
 */
export async function decryptPayload(encryptedBase64: string, keyStr: string): Promise<string> {
  if (!encryptedBase64) {
    throw new Error('decryptPayload: encryptedBase64 is undefined or null');
  }
  try {
    const combinedBytes = base64ToUint8Array(encryptedBase64);
    
    if (combinedBytes.length < 16) {
      throw new Error('Invalid encrypted payload: too short');
    }
    
    // Extract IV (first 16 bytes)
    const iv = combinedBytes.slice(0, 16);
    // Extract ciphertext (remaining bytes)
    const ciphertext = combinedBytes.slice(16);
    
    const cryptoKey = await importKey(keyStr);
    
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-CBC',
        iv: iv,
      },
      cryptoKey,
      ciphertext
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw error;
  }
}
