import type { Media } from '../types';
import { generateId } from './contacts';

// In-memory storage (would be replaced with database/S3 in production)
export const mediaStore = new Map<string, Media>();

// Upload media file
export async function uploadMedia(request: Request): Promise<Response> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return Response.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const id = generateId();
    const now = new Date().toISOString();

    // Store file
    const uploadsDir = './uploads';
    const buffer = await file.arrayBuffer();
    await Bun.write(`${uploadsDir}/${id}-${file.name}`, buffer);

    const media: Media = {
      id,
      filename: file.name,
      mimetype: file.type,
      size: file.size,
      url: `/media/${id}-${file.name}`,
      thumbnailUrl: undefined,
      contactId: formData.get('contactId') as string || undefined,
      dealId: formData.get('dealId') as string || undefined,
      uploadedBy: formData.get('userId') as string || 'system',
      uploadedAt: now,
    };

    // Generate thumbnail for images
    if (file.type.startsWith('image/')) {
      media.thumbnailUrl = media.url;
    }

    mediaStore.set(id, media);

    return Response.json({ success: true, data: media });
  } catch (error) {
    console.error('Upload error:', error);
    return Response.json(
      { success: false, error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

// List media files
export async function listMedia(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const contactId = url.searchParams.get('contactId');
  const dealId = url.searchParams.get('dealId');
  const type = url.searchParams.get('type');

  let results = Array.from(mediaStore.values());

  if (contactId) {
    results = results.filter(m => m.contactId === contactId);
  }

  if (dealId) {
    results = results.filter(m => m.dealId === dealId);
  }

  if (type) {
    results = results.filter(m => m.mimetype.startsWith(type));
  }

  return Response.json({ success: true, data: results });
}

// Delete media file
export async function deleteMedia(request: Request, params: Record<string, string>): Promise<Response> {
  const media = mediaStore.get(params.id);
  if (!media) {
    return Response.json({ success: false, error: 'Media not found' }, { status: 404 });
  }

  // Delete file from disk
  try {
    const filePath = `./uploads/${params.id}-${media.filename}`;
    await Bun.write(filePath, ''); // Overwrite with empty
    // Note: In production, you'd use proper file deletion
  } catch (error) {
    console.error('Failed to delete file:', error);
  }

  mediaStore.delete(params.id);

  return Response.json({ success: true });
}
