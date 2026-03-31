/**
 * E2EEService.ts
 * Implements strict RSA + AES zero-trust encryption structures utilizing the native browser WebCrypto API.
 */

export class E2EEService {
    
    // Generates a local, high-entropy 2048-bit RSA Key Pair
    static async generateRSAKeyPair(): Promise<CryptoKeyPair> {
        return await window.crypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: "SHA-256",
            },
            true, // Allow exporting of Public Key
            ["encrypt", "decrypt"]
        );
    }

    // Renders the Public Key into Base64 format for REST routing
    static async exportPublicKey(publicKey: CryptoKey): Promise<string> {
        const exported = await window.crypto.subtle.exportKey("spki", publicKey);
        let binaryStr = "";
        const bytes = new Uint8Array(exported);
        for (let i = 0; i < bytes.byteLength; i++) {
            binaryStr += String.fromCharCode(bytes[i]);
        }
        return btoa(binaryStr);
    }

    // Maps a remote Base64 string from the database back into the WebCrypto API
    static async importPublicKey(base64PublicKey: string): Promise<CryptoKey> {
        const binaryDerString = atob(base64PublicKey);
        const binaryDer = new Uint8Array(binaryDerString.length);
        for (let i = 0; i < binaryDerString.length; i++) {
            binaryDer[i] = binaryDerString.charCodeAt(i);
        }

        return await window.crypto.subtle.importKey(
            "spki",
            binaryDer.buffer,
            {
                name: "RSA-OAEP",
                hash: "SHA-256"
            },
            true,
            ["encrypt"]
        );
    }

    // Exports formatting the Private Key to Base64 (PKCS8) for LocalStorage
    static async exportPrivateKey(privateKey: CryptoKey): Promise<string> {
        const exported = await window.crypto.subtle.exportKey("pkcs8", privateKey);
        let binaryStr = "";
        const bytes = new Uint8Array(exported);
        for (let i = 0; i < bytes.byteLength; i++) {
            binaryStr += String.fromCharCode(bytes[i]);
        }
        return btoa(binaryStr);
    }

    // Resolves Private PKCS8 Base64 strings from LocalStorage back into WebCrypto Objects
    static async importPrivateKey(base64PrivateKey: string): Promise<CryptoKey> {
        const binaryDerString = atob(base64PrivateKey);
        const binaryDer = new Uint8Array(binaryDerString.length);
        for (let i = 0; i < binaryDerString.length; i++) {
            binaryDer[i] = binaryDerString.charCodeAt(i);
        }

        return await window.crypto.subtle.importKey(
            "pkcs8",
            binaryDer.buffer,
            {
                name: "RSA-OAEP",
                hash: "SHA-256"
            },
            true,
            ["decrypt"]
        );
    }

    // Generates an ephemeral AES-GCM 256 symmetric session key exclusively for a single message
    static async generateAESKey(): Promise<CryptoKey> {
        return await window.crypto.subtle.generateKey(
            {
                name: "AES-GCM",
                length: 256
            },
            true, // Must be exportable to encrypt and append to the payload
            ["encrypt", "decrypt"]
        );
    }

    // Returns the encrypted string + IV initializing vectors
    static async encryptMessage(text: string, aesKey: CryptoKey): Promise<{iv: string, ciphertext: string}> {
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encodedText = new TextEncoder().encode(text);
        
        const encrypted = await window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            aesKey,
            encodedText
        );
        
        return {
            iv: btoa(String.fromCharCode(...new Uint8Array(iv))),
            ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted)))
        };
    }

    // Parses raw Base64 data back against the original AES session mapping
    static async decryptMessage(ciphertextB64: string, ivB64: string, aesKey: CryptoKey): Promise<string> {
        const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));
        const ciphertext = Uint8Array.from(atob(ciphertextB64), c => c.charCodeAt(0));
        
        const decrypted = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            aesKey,
            ciphertext
        );
        
        return new TextDecoder().decode(decrypted);
    }

    // Takes the ephemeral Session Key and encrypts it utilizing the recipient's Public RSA Key
    static async encryptAESKeyWithRSA(aesKey: CryptoKey, rsaPubKey: CryptoKey): Promise<string> {
        // Raw export
        const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);
        
        // Encrypt via RSA
        const encryptedKey = await window.crypto.subtle.encrypt(
            {
                name: "RSA-OAEP"
            },
            rsaPubKey,
            rawAesKey
        );
        
        return btoa(String.fromCharCode(...new Uint8Array(encryptedKey)));
    }

    // RECIP_SESSION_DECRYPT: Recipient decodes ephemeral AES Session Block
    static async decryptAESKeyWithRSA(encryptedAesKeyB64: string, rsaPrivKey: CryptoKey): Promise<CryptoKey> {
        const encryptedKey = Uint8Array.from(atob(encryptedAesKeyB64), c => c.charCodeAt(0));
        
        const rawAesKey = await window.crypto.subtle.decrypt(
            {
                name: "RSA-OAEP"
            },
            rsaPrivKey,
            encryptedKey
        );
        
        return await window.crypto.subtle.importKey(
            "raw",
            rawAesKey,
            "AES-GCM",
            true,
            ["encrypt", "decrypt"]
        );
    }

    // TACTICAL_DATA_LINK: Encrypts raw binary buffers directly (Files/Images)
    static async encryptBinary(data: ArrayBuffer, aesKey: CryptoKey): Promise<{iv: string, ciphertext: string}> {
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        
        const encrypted = await window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            aesKey,
            data
        );
        
        return {
            iv: btoa(String.fromCharCode(...new Uint8Array(iv))),
            ciphertext: this.arrayBufferToBase64(encrypted)
        };
    }

    // TACTICAL_DATA_LINK: Decrypts encrypted binary cipher packets
    static async decryptBinary(ciphertextB64: string, ivB64: string, aesKey: CryptoKey): Promise<ArrayBuffer> {
        const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));
        const ciphertext = this.base64ToArrayBuffer(ciphertextB64);
        
        return await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            aesKey,
            ciphertext
        );
    }

    // Optimized Base64 helpers for large binary buffers
    private static arrayBufferToBase64(buffer: ArrayBuffer): string {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    private static base64ToArrayBuffer(base64: string): ArrayBuffer {
        const binary_string = atob(base64);
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
    }
}
