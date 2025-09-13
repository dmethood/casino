import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { saveFile } from '@/lib/upload';
import { uploadRateLimit } from '@/lib/ratelimit';
import { verifyCSRF } from '@/lib/csrf';
import { createRequestLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const logger = createRequestLogger(request);

  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Apply rate limiting
    const rateLimitResult = uploadRateLimit(request);
    if (!rateLimitResult.success) {
      logger.warn('Upload rate limit exceeded', { userId: session.user.id });
      return NextResponse.json(
        { error: 'Too many requests' },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.reset.getTime() - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Verify CSRF token
    if (!verifyCSRF(request)) {
      logger.warn('Upload CSRF verification failed', { userId: session.user.id });
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 403 }
      );
    }

    // Get the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    logger.info('Processing file upload', {
      userId: session.user.id,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });

    // Save the file
    const result = await saveFile(file);

    if (!result.success) {
      logger.warn('File upload failed', { 
        userId: session.user.id,
        error: result.error,
      });
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    logger.info('File uploaded successfully', {
      userId: session.user.id,
      filePath: result.filePath,
    });

    return NextResponse.json({
      success: true,
      filePath: result.filePath,
      url: result.filePath,
    });

  } catch (error) {
    logger.error('Upload processing failed', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
