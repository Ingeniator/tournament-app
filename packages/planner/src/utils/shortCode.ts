import { ref, get } from 'firebase/database';
import { db } from '../firebase';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

function randomCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

export async function generateUniqueCode(basePath = 'codes'): Promise<string> {
  if (!db) throw new Error('Firebase not configured');
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomCode();
    const snapshot = await get(ref(db, `${basePath}/${code}`));
    if (!snapshot.exists()) return code;
  }
  throw new Error('Failed to generate unique code after 10 attempts');
}
