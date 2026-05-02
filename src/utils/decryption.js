import CryptoJS from 'crypto-js';

export function decryptSipCredentials(encryptedUser, secretKeyBase64) {
  const iv         = CryptoJS.enc.Base64.parse(encryptedUser.init_vector);
  const ciphertext = CryptoJS.enc.Base64.parse(encryptedUser.data);
  const key        = CryptoJS.enc.Base64.parse(secretKeyBase64);

  const decrypted = CryptoJS.AES.decrypt(
    { ciphertext },
    key,
    { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
  );

  return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
  // → { sip_user, sip_password, sip_domain, extension, ... }
}