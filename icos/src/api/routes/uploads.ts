import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { IcosDb } from '../../db';
import { requireAuth } from '../../auth/middleware';

const UPLOADS_DIR = path.join(__dirname, '../../../uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

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
});

export function uploadsRouter(db: IcosDb): Router {
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

  return router;
}
