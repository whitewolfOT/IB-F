import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { IIcosDb } from '../../db/interface';
import { requireAuth } from '../../auth/middleware';

const UPLOADS_DIR = path.join(__dirname, '../../../uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg', 'image/png', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx', '.txt']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(file.mimetype) || !ALLOWED_EXTENSIONS.has(ext)) {
      cb(new Error(`File type not allowed: ${file.mimetype} (${ext})`));
      return;
    }
    cb(null, true);
  },
});

export function uploadsRouter(db: IIcosDb): Router {
  const router = Router();

  router.post('/', requireAuth, upload.single('file'), (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const record = {
        file_id: uuidv4(),
        filename: req.file.filename,
        original_name: req.file.originalname,
        mime_type: req.file.mimetype,
        size_bytes: req.file.size,
        uploaded_by: req.user!.user_id,
        created_at: new Date().toISOString(),
      };

      db.insertUploadRecord(record);

      res.status(201).json({
        file_id: record.file_id,
        filename: record.filename,
        original_name: record.original_name,
        size: record.size_bytes,
        url: `/uploads/${record.filename}`,
      });
    } catch (err) {
      const msg = (err as Error).message;
      res.status(msg.includes('too large') || msg.includes('File too large') ? 413 : 400).json({ error: msg });
    }
  });

  router.delete('/:fileId', requireAuth, (req, res) => {
    const record = db.getUploadRecord(String(req.params.fileId));
    if (!record) { res.status(404).json({ error: 'File not found' }); return; }
    if (record.uploaded_by !== req.user!.user_id && !req.user!.is_master) {
      res.status(403).json({ error: 'Not the file owner' }); return;
    }
    try {
      fs.unlinkSync(path.join(UPLOADS_DIR, record.filename));
    } catch { /* file may not exist on disk */ }
    db.deleteUploadRecord(String(req.params.fileId));
    res.json({ ok: true });
  });

  return router;
}
