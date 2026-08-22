import { Response } from 'express';
import { AuthRequest } from '../types';
import { isUploadKind, presignUpload } from '../storage/s3';

/**
 * POST /api/uploads/presign
 *
 * Returns a short-lived authorisation for the browser to upload one file
 * directly to S3. The response carries the fields S3 requires; the caller
 * posts them as multipart form-data to `post.url`, then sends the returned
 * `key` back to whichever endpoint stores the reference.
 */
export async function presign(req: AuthRequest, res: Response): Promise<void> {
  const { kind, contentType, extension } = req.body as {
    kind?: string;
    contentType?: string;
    extension?: string;
  };

  if (!isUploadKind(kind)) {
    res.status(400).json({ message: "kind must be one of 'logo', 'avatar', 'product'" });
    return;
  }

  if (!contentType) {
    res.status(400).json({ message: 'contentType is required' });
    return;
  }

  // Only a Manager may replace store branding or product imagery; avatars are
  // the user's own, so any authenticated role may upload one.
  if (kind !== 'avatar' && req.user?.role !== 'Manager') {
    res.status(403).json({ message: 'Insufficient permissions' });
    return;
  }

  try {
    const { key, post, maxBytes } = await presignUpload(
      kind,
      req.tenantDbName!,
      contentType,
      extension ?? ''
    );
    res.json({ data: { key, post, maxBytes } });
  } catch (err) {
    res.status(400).json({ message: err instanceof Error ? err.message : 'Could not presign upload' });
  }
}
