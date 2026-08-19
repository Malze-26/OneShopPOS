import { api } from './api';

type UploadKind = 'logo' | 'avatar' | 'product';

interface PresignResponse {
  data: {
    key: string;
    post: { url: string; fields: Record<string, string> };
    maxBytes: number;
  };
}

/**
 * Uploads one file straight to S3 and returns its object key.
 *
 * The file never touches the API — it goes to S3 under a short-lived
 * authorisation, and only the resulting key is sent back to the server. The
 * caller passes that key to whichever endpoint records the reference.
 */
export async function uploadToS3(file: File, kind: UploadKind): Promise<string> {
  const extension = file.name.includes('.')
    ? file.name.slice(file.name.lastIndexOf('.'))
    : '';

  const { data: presigned } = await api.post<PresignResponse>('/uploads/presign', {
    kind,
    contentType: file.type,
    extension,
  });

  const { key, post, maxBytes } = presigned.data;

  // Fail fast with a clear message; S3 also enforces this and would otherwise
  // reject with an opaque 400.
  if (file.size > maxBytes) {
    throw new Error(`File is too large — maximum ${Math.round(maxBytes / 1024 / 1024)}MB`);
  }

  const form = new FormData();
  Object.entries(post.fields).forEach(([name, value]) => form.append(name, value));
  form.append('file', file);

  const res = await fetch(post.url, { method: 'POST', body: form });
  if (!res.ok) {
    throw new Error(`Upload failed (${res.status})`);
  }

  return key;
}

/** Uploads several files in parallel, returning their keys in input order. */
export async function uploadAllToS3(files: File[], kind: UploadKind): Promise<string[]> {
  return Promise.all(files.map((f) => uploadToS3(f, kind)));
}
