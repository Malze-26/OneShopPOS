import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { createPresignedPost, type PresignedPost } from '@aws-sdk/s3-presigned-post';

/**
 * Uploads go straight from the browser to S3 via a presigned POST; the file
 * never passes through this API. That keeps the request under Lambda's 6 MB
 * synchronous payload ceiling — the old multipart route allowed 10 files at
 * 5 MB each — and removes the local-disk dependency that made the API
 * undeployable to any ephemeral filesystem.
 */

export type UploadKind = 'logo' | 'avatar' | 'product';

interface KindPolicy {
  /** Object key prefix, below the per-tenant prefix. */
  folder: string;
  maxBytes: number;
  contentTypes: string[];
}

const POLICIES: Record<UploadKind, KindPolicy> = {
  logo:    { folder: 'logo',     maxBytes: 2 * 1024 * 1024, contentTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'] },
  avatar:  { folder: 'avatars',  maxBytes: 2 * 1024 * 1024, contentTypes: ['image/png', 'image/jpeg', 'image/webp'] },
  product: { folder: 'products', maxBytes: 5 * 1024 * 1024, contentTypes: ['image/png', 'image/jpeg', 'image/webp'] },
};

export function isUploadKind(value: unknown): value is UploadKind {
  return typeof value === 'string' && value in POLICIES;
}

function bucket(): string {
  const name = process.env.S3_BUCKET;
  if (!name) throw new Error('S3_BUCKET is not set');
  return name;
}

let client: S3Client | undefined;
function s3(): S3Client {
  // Reused across Lambda invocations; the SDK resolves credentials from the
  // execution role, so no keys are needed in the environment.
  client ??= new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });
  return client;
}

/**
 * Every object lives under its tenant's prefix, so a key minted for one tenant
 * can never address another's assets even if the caller tampers with it.
 */
export function tenantPrefix(tenantDb: string): string {
  return `tenants/${tenantDb}/`;
}

export function keyBelongsToTenant(key: string, tenantDb: string): boolean {
  return key.startsWith(tenantPrefix(tenantDb)) && !key.includes('..');
}

/** Public URL for a stored object, served through the CDN when one is set. */
export function publicUrl(key: string): string {
  const base = process.env.ASSET_BASE_URL;
  if (base) return `${base.replace(/\/$/, '')}/${key}`;
  return `https://${bucket()}.s3.${process.env.AWS_REGION ?? 'us-east-1'}.amazonaws.com/${key}`;
}

export interface PresignResult {
  key: string;
  post: PresignedPost;
  maxBytes: number;
}

/**
 * Mints a one-shot upload authorisation. S3 itself enforces the content type
 * and the size ceiling via POST conditions, so a client cannot exceed the
 * policy by editing the request.
 */
export async function presignUpload(
  kind: UploadKind,
  tenantDb: string,
  contentType: string,
  extension: string
): Promise<PresignResult> {
  const policy = POLICIES[kind];

  if (!policy.contentTypes.includes(contentType)) {
    throw new Error(`Unsupported content type '${contentType}' for ${kind}`);
  }

  const safeExt = extension.toLowerCase().replace(/[^a-z0-9.]/g, '') || '.bin';
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const key = `${tenantPrefix(tenantDb)}${policy.folder}/${unique}${safeExt}`;

  const post = await createPresignedPost(s3(), {
    Bucket: bucket(),
    Key: key,
    Conditions: [
      ['content-length-range', 1, policy.maxBytes],
      ['eq', '$Content-Type', contentType],
    ],
    Fields: { 'Content-Type': contentType },
    Expires: 300,
  });

  return { key, post, maxBytes: policy.maxBytes };
}

/** Best-effort cleanup; a leftover object is harmless, a failed request is not. */
export async function deleteObject(key: string): Promise<void> {
  try {
    await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
  } catch (err) {
    console.warn('[S3] Failed to delete', key, err instanceof Error ? err.message : err);
  }
}
