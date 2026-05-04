// ── AES-256-GCM CLIENT-SIDE ENCRYPTION ──
const DiaryEncryption = {
  PBKDF2_ITERATIONS: 100000,
  VERIFY_STRING: 'habitforge-verify-v1',

  async deriveKey(pin, salt) {
    const pinBytes = new TextEncoder().encode(pin);
    const keyMaterial = await crypto.subtle.importKey('raw', pinBytes, 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: this.PBKDF2_ITERATIONS, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  },

  async encrypt(plaintext, pin) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(pin, salt);
    const encoded = new TextEncoder().encode(plaintext);
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

    return {
      encrypted_blob: this._toBase64(new Uint8Array(ciphertext)),
      iv: this._toBase64(iv),
      salt: this._toBase64(salt)
    };
  },

  async decrypt(encryptedBlob, ivB64, saltB64, pin) {
    const salt = this._fromBase64(saltB64);
    const iv = this._fromBase64(ivB64);
    const ciphertext = this._fromBase64(encryptedBlob);
    const key = await this.deriveKey(pin, salt);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return new TextDecoder().decode(decrypted);
  },

  async setupPIN(pin) {
    const { encrypted_blob, iv, salt } = await this.encrypt(this.VERIFY_STRING, pin);
    localStorage.setItem('hf_pin_verify', JSON.stringify({ encrypted_blob, iv, salt }));
    sessionStorage.setItem('hf_pin_unlocked', '1');
    sessionStorage.setItem('hf_active_pin', pin);
  },

  async verifyPIN(pin) {
    const stored = localStorage.getItem('hf_pin_verify');
    if (!stored) return false;
    const { encrypted_blob, iv, salt } = JSON.parse(stored);
    try {
      const result = await this.decrypt(encrypted_blob, iv, salt, pin);
      if (result === this.VERIFY_STRING) {
        sessionStorage.setItem('hf_pin_unlocked', '1');
        sessionStorage.setItem('hf_active_pin', pin);
        return true;
      }
      return false;
    } catch { return false; }
  },

  hasPIN() { return !!localStorage.getItem('hf_pin_verify'); },
  isUnlocked() { return sessionStorage.getItem('hf_pin_unlocked') === '1'; },
  getActivePin() { return sessionStorage.getItem('hf_active_pin'); },
  lock() { sessionStorage.removeItem('hf_pin_unlocked'); sessionStorage.removeItem('hf_active_pin'); },

  _toBase64(arr) { return btoa(String.fromCharCode(...arr)); },
  _fromBase64(b64) { return new Uint8Array(atob(b64).split('').map(c => c.charCodeAt(0))); }
};
