import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  const { filename } = req.query; // di Vercel Serverless query params dipakai
  if (!filename) return res.status(400).json({ success: false, msg: 'Filename required' });

  try {
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
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
}
