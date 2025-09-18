import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// fungsi generate nama file unik per bulan/tahun
function generateFilename(originalname) {
  const bulan = new Date().toLocaleString('id-ID', { month: 'long' }); // September
  const tahun = new Date().getFullYear();
  const ext = path.extname(originalname); // .pdf
  const namaBaru = `${bulan}_${tahun}${ext}`;
  return namaBaru;
}

// multer untuk handle file di memori (tidak simpan ke disk)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// upload ke Supabase
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, msg: 'No file uploaded' });

  const filename = generateFilename(req.file.originalname);

  // Upload ke bucket Supabase
  const { data, error } = await supabase.storage
    .from(process.env.SUPABASE_BUCKET)
    .upload(filename, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: true // supaya overwrite jika sama
    });

  if (error) {
    return res.status(500).json({ success: false, msg: error.message });
  }

  // buat URL publik
  const { data: publicUrl } = supabase.storage
    .from(process.env.SUPABASE_BUCKET)
    .getPublicUrl(filename);

  res.json({ success: true, filename, url: publicUrl.publicUrl });
});

// list file
app.get('/files', async (req, res) => {
  try {
    const { data, error } = await supabase
      .storage
      .from(process.env.SUPABASE_BUCKET) // misal 'pdfs'
      .list('', { limit: 100, offset: 0 }); // folder root

    if (error) {
      return res.status(500).json({ success: false, msg: error.message });
    }

    // data = array of objects { name, id, updated_at, ... }
    // kalau kamu cuma butuh nama file saja:
    const files = data.map(f => f.name);

    res.json({ success: true, files });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
});

// delete file
app.get('/files', async (req, res) => {
  try {
    const { data, error } = await supabase
      .storage
      .from(process.env.SUPABASE_BUCKET)
      .list('');

    if (error) return res.status(500).json({ success: false, msg: error.message });

    const files = data.map(f => {
      const { data: publicUrl } = supabase
        .storage
        .from(process.env.SUPABASE_BUCKET)
        .getPublicUrl(f.name);

      return { name: f.name, url: f.__filename, publicUrl: publicUrl.publicUrl };
    });

    res.json({ success: true, files });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
});

app.get('/file/:name', async (req, res) => {
  const { name } = req.params;
  const { data, error } = await supabase
    .storage
    .from(process.env.SUPABASE_BUCKET)
    .download(name);

  if (error) return res.status(500).json({ error });

  // data.body adalah ReadableStream (di Node supabase-js v2)
  const chunks = [];
  for await (const chunk of data.body) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  res.setHeader('Content-Type', 'application/pdf');
  res.send(buffer);
});



app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
