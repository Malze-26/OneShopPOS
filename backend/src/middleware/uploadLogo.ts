import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

const LOGO_DIR = path.join(process.cwd(), 'uploads', 'logo');

if (!fs.existsSync(LOGO_DIR)) {
  fs.mkdirSync(LOGO_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, LOGO_DIR),
  filename: (req: Request, file, cb) => {
    // Use the tenant DB name so each tenant has its own file (no cross-tenant contamination).
    const tenantId = (req.headers['oneshop-tenant-id'] as string | undefined) ?? 'default';
    const safeTenantId = tenantId.replace(/[^a-z0-9_-]/gi, '_');
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `store-logo-${safeTenantId}${ext}`);
  },
});

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only jpeg, png, or webp images are allowed'));
  }
};

export const uploadLogoMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
});
