import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

export const UPLOAD_DIR = 'uploads';
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

export interface UploadResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
    };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
    };
  }

  return { valid: true };
}

export function generateFileName(originalName: string): string {
  const ext = path.extname(originalName);
  const randomName = randomBytes(16).toString('hex');
  return `${randomName}${ext}`;
}

export function getUploadPath(fileName: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  return path.join(UPLOAD_DIR, year.toString(), month, fileName);
}

export async function ensureUploadDirectory(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

export async function saveFile(file: File): Promise<UploadResult> {
  try {
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // Generate unique filename
    const fileName = generateFileName(file.name);
    const filePath = getUploadPath(fileName);
    const fullPath = path.join(process.cwd(), 'public', filePath);

    // Ensure directory exists
    await ensureUploadDirectory(fullPath);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save file
    await fs.writeFile(fullPath, buffer);

    return {
      success: true,
      filePath: `/${filePath.replace(/\\/g, '/')}`, // Normalize path for web
    };
  } catch (error) {
    console.error('Error saving file:', error);
    return {
      success: false,
      error: 'Failed to save file',
    };
  }
}

export async function deleteFile(filePath: string): Promise<boolean> {
  try {
    const fullPath = path.join(process.cwd(), 'public', filePath);
    await fs.unlink(fullPath);
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

export function getFileUrl(filePath: string): string {
  if (!filePath) return '';
  return filePath.startsWith('/') ? filePath : `/${filePath}`;
}
