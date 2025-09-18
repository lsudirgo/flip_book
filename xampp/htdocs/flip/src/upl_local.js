import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());


const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// fungsi generate nama file unik per bulan/tahun
function generateFilename(originalname) {
  const bulan = new Date().toLocaleString('id-ID', { month: 'long' }); // September
  const tahun = new Date().getFullYear();
  const ext = path.extname(originalname); // ambil ekstensi asli (.pdf)
  const namaBaru = `${bulan}_${tahun}${ext}`; // .pdf, .docx, dll
  return namaBaru;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const filename = generateFilename(file.originalname);
    cb(null, filename);
  }
});

const upload = multer({ storage });

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, msg: 'No file' });
  res.json({ success: true, filename: req.file.filename });
});

// Delete file
app.delete('/files/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(uploadDir, filename);
  if (!fs.existsSync(filepath)) return res.status(404).json({ success: false, msg: 'File not found' });
  fs.unlink(filepath, err => {
    if (err) return res.status(500).json({ success: false, msg: err.message });
    res.json({ success: true, msg: 'File deleted' });
  });
});

// List semua file di folder uploads
app.get('/files', (req, res) => {
  fs.readdir(uploadDir, (err, files) => {
    if (err) return res.status(500).json({ success: false, msg: err.message });
    res.json({ success: true, files });
  });
});

app.use('/uploads', express.static(uploadDir));

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
