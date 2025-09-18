import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Static folder untuk file CSS/JS/etc
app.use('/css', express.static(path.join(__dirname, '../css')));
app.use('/js', express.static(path.join(__dirname, '../js')));

// Static HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

app.get('/upload', (req, res) => {
  res.sendFile(path.join(__dirname, '../upload/index.html'));
});

// Endpoint untuk ambil file PDF dari Supabase
app.get('/uploads/:filename', async (req, res) => {
  const { filename } = req.params;
  const { data, error } = await supabase.storage
    .from(process.env.SUPABASE_BUCKET)
    .download(filename);

  if (error) return res.status(500).json({ success: false, msg: error.message });

  const chunks = [];
  for await (const chunk of data) chunks.push(chunk);
  const buffer = Buffer.concat(chunks);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.send(buffer);
});

// Jalankan server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
