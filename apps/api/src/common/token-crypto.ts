// Cifragem simétrica para segredos guardados no banco (tokens OAuth do lojista
// no Mercado Pago). AES-256-GCM: confidencialidade + autenticação (tag).
//
// A chave vem de TOKEN_ENCRYPTION_KEY (env) — 32 bytes em hex (64 chars) ou uma
// passphrase qualquer (derivada por SHA-256 para 32 bytes). Sem segredo no
// código (regra inviolável do projeto). Formato do texto cifrado:
//   base64(iv).base64(authTag).base64(ciphertext)
// Nunca gravar o token em claro; nunca devolver token em resposta de API.

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12; // recomendado para GCM

function resolveKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY não configurado — necessário para cifrar tokens do gateway.',
    );
  }
  // 64 chars hex = 32 bytes exatos; qualquer outra coisa é derivada por SHA-256.
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  return createHash('sha256').update(raw).digest();
}

export function encryptSecret(plain: string): string {
  const key = resolveKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plain, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString('base64'),
    tag.toString('base64'),
    ciphertext.toString('base64'),
  ].join('.');
}

export function decryptSecret(encoded: string): string {
  const key = resolveKey();
  const [ivB64, tagB64, dataB64] = encoded.split('.');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Texto cifrado em formato inválido.');
  }
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
