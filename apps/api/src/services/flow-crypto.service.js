import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const KEYS_DIR = path.resolve(__dirname, '../../keys');
const PRIVATE_KEY_PATH = path.join(KEYS_DIR, 'flow_private_key.pem');
const PUBLIC_KEY_PATH = path.join(KEYS_DIR, 'flow_public_key.pem');

/**
 * Ensures a 2048-bit RSA keypair exists for WhatsApp Flow encryption/decryption.
 * Creates keys on disk if they don't already exist.
 */
export function getOrCreateFlowKeyPair() {
    if (!fs.existsSync(KEYS_DIR)) {
        fs.mkdirSync(KEYS_DIR, { recursive: true });
    }

    if (fs.existsSync(PRIVATE_KEY_PATH) && fs.existsSync(PUBLIC_KEY_PATH)) {
        return {
            privateKeyPem: fs.readFileSync(PRIVATE_KEY_PATH, 'utf8'),
            publicKeyPem: fs.readFileSync(PUBLIC_KEY_PATH, 'utf8'),
        };
    }

    console.log('[FlowCrypto] Generating new 2048-bit RSA key pair for WhatsApp Flows...');
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem',
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',
        },
    });

    fs.writeFileSync(PRIVATE_KEY_PATH, privateKey, { encoding: 'utf8', mode: 0o600 });
    fs.writeFileSync(PUBLIC_KEY_PATH, publicKey, { encoding: 'utf8', mode: 0o644 });
    console.log(`[FlowCrypto] Key pair saved to ${KEYS_DIR}`);

    return {
        privateKeyPem: privateKey,
        publicKeyPem: publicKey,
    };
}

/**
 * Decrypts an incoming WhatsApp Flow request.
 *
 * Meta Flow Specification (data_api_version: "3.0"):
 * 1. encrypted_aes_key is decrypted using RSA-OAEP with SHA-256 (MGF1 with SHA-256).
 * 2. initial_vector is decoded from Base64.
 * 3. encrypted_flow_data is decoded from Base64.
 *    The last 16 bytes is the AES-GCM authentication tag.
 *    The remainder is the ciphertext, decrypted with AES-128-GCM using aesKey and IV.
 *
 * @param {string} encryptedFlowDataB64
 * @param {string} encryptedAesKeyB64
 * @param {string} initialVectorB64
 * @param {string} [customPrivateKeyPem]
 * @returns {{ decryptedBody: any, aesKey: Buffer, initialVector: Buffer }}
 */
export function decryptFlowRequest(
    encryptedFlowDataB64,
    encryptedAesKeyB64,
    initialVectorB64,
    customPrivateKeyPem = null
) {
    const { privateKeyPem } = customPrivateKeyPem
        ? { privateKeyPem: customPrivateKeyPem }
        : getOrCreateFlowKeyPair();

    // 1. Decrypt 128-bit AES key using RSA-OAEP with SHA-256
    const encryptedAesKeyBuf = Buffer.from(encryptedAesKeyB64, 'base64');
    const aesKey = crypto.privateDecrypt(
        {
            key: privateKeyPem,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256',
        },
        encryptedAesKeyBuf
    );

    // 2. Decode initialization vector
    const initialVector = Buffer.from(initialVectorB64, 'base64');

    // 3. Decrypt flow data with AES-128-GCM
    const flowDataBuf = Buffer.from(encryptedFlowDataB64, 'base64');
    if (flowDataBuf.length < 16) {
        throw new Error('Encrypted flow data is too short to contain an auth tag');
    }

    const authTag = flowDataBuf.subarray(flowDataBuf.length - 16);
    const ciphertext = flowDataBuf.subarray(0, flowDataBuf.length - 16);

    const decipher = crypto.createDecipheriv('aes-128-gcm', aesKey, initialVector);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const decryptedBody = JSON.parse(decrypted.toString('utf8'));

    return {
        decryptedBody,
        aesKey,
        initialVector,
    };
}

/**
 * Encrypts an outgoing WhatsApp Flow response.
 *
 * Meta Flow Specification (data_api_version: "3.0"):
 * 1. The initialization vector is flipped: every byte is XOR'ed with 0xFF.
 * 2. The response JSON is encoded to UTF-8.
 * 3. Encrypted using AES-128-GCM with the decrypted AES key and flipped IV.
 * 4. The 16-byte GCM authentication tag is appended to the ciphertext.
 * 5. The result is returned as a Base64 string.
 *
 * @param {object} responseBody
 * @param {Buffer} aesKey
 * @param {Buffer} initialVector
 * @returns {string} Base64 encoded encrypted response
 */
export function encryptFlowResponse(responseBody, aesKey, initialVector) {
    // 1. Invert all bits of the initialization vector (XOR with 0xFF)
    const responseIv = Buffer.from(initialVector.map((byte) => byte ^ 0xff));

    // 2. Prepare plaintext JSON string
    const plaintext = Buffer.from(JSON.stringify(responseBody), 'utf8');

    // 3. Encrypt using AES-128-GCM
    const cipher = crypto.createCipheriv('aes-128-gcm', aesKey, responseIv);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // 4. Append 16-byte auth tag to ciphertext
    const fullPayload = Buffer.concat([ciphertext, authTag]);

    // 5. Return as Base64 string
    return fullPayload.toString('base64');
}

