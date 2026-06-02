import multer from 'multer';
import config from '../config/index.js';
import { extensionOf } from '../services/fileParser.js';
import { ValidationError } from '../utils/logger.js';

const ALLOWED = new Set(['csv', 'xlsx', 'xls', 'json']);

/**
 * Simpan file di memori (Buffer) — tidak ditulis ke disk, sejalan dengan
 * janji privasi "data tidak disimpan".
 */
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxBytes, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = extensionOf(file.originalname);
    if (!ALLOWED.has(ext)) {
      return cb(new ValidationError(`Format ".${ext}" tidak didukung. Gunakan CSV, XLSX, XLS, atau JSON.`));
    }
    cb(null, true);
  },
});

/**
 * Bungkus multer.single agar error multer (mis. file terlalu besar)
 * diterjemahkan ke ValidationError yang konsisten.
 */
export function singleFile(fieldName = 'file') {
  const handler = upload.single(fieldName);
  return (req, res, next) => {
    handler(req, res, (err) => {
      if (!err) return next();
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(
            new ValidationError(
              `Ukuran file melebihi batas ${(config.upload.maxBytes / 1024 / 1024).toFixed(1)} MB.`
            )
          );
        }
        return next(new ValidationError(`Upload gagal: ${err.message}`));
      }
      return next(err);
    });
  };
}
