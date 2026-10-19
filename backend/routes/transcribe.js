const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const generateUniqueId = () => {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return crypto.randomBytes(16).toString('hex');
};
let ffmpeg = null;
let OpenAI = null;
try {
  ffmpeg = require('fluent-ffmpeg');
} catch (_) {}

try {
  OpenAI = require('openai');
} catch (_) {}

// Initialize OpenAI conditionally - so it doesn't crash if the key is missing initially
let openai = null;
if (OpenAI && process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'MISSING_KEY') {
  try {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  } catch (e) {
    console.warn('OpenAI initialization failed.');
  }
}

const MAX_CHUNK_SIZE_MB = 24; // OpenAI limit is 25MB, we use 24MB to be safe

// Helper function to get file size in MB
const getFileSizeMB = (filePath) => {
  const stats = fs.statSync(filePath);
  return stats.size / (1024 * 1024);
};

// Helper function to chunk audio using ffmpeg
const chunkAudio = (inputFile, outputDir, baseName) => {
  return new Promise((resolve, reject) => {
    // We'll chunk by 10 minute segments (600 seconds) to stay well under 25MB for compressed audio
    ffmpeg(inputFile)
      .outputOptions(['-f segment', '-segment_time 600', '-c copy'])
      .output(path.join(outputDir, `${baseName}_%03d.mp3`))
      .on('end', () => {
        // Collect all generated files
        fs.readdir(outputDir, (err, files) => {
          if (err) return reject(err);
          const chunks = files
            .filter(f => f.startsWith(baseName) && f.endsWith('.mp3'))
            .sort()
            .map(f => path.join(outputDir, f));
          resolve(chunks);
        });
      })
      .on('error', (err) => {
        reject(err);
      })
      .run();
  });
};

router.post('/', async (req, res) => {
  if (!req.files || !req.files.audio) {
    return res.status(400).json({ error: 'No audio file uploaded' });
  }

  if (!OpenAI || !ffmpeg) {
    return res.status(503).json({ error: 'Audio transcription is not configured on this server.' });
  }

  if (process.env.OPENAI_API_KEY === 'MISSING_KEY' || !process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI API Key is missing. Please contact the administrator.' });
  }

  const audioFile = req.files.audio;
  const tempDir = path.join(__dirname, '..', 'uploads', 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const fileId = generateUniqueId();
  // Using .mp3 as an extension. OpenAI supports mp3, mp4, mpeg, mpga, m4a, wav, and webm
  const inputFilePath = path.join(tempDir, `${fileId}_input.mp3`);

  try {
    // 1. Save uploaded file to disk
    await audioFile.mv(inputFilePath);

    // 2. Check if file is small enough to send directly
    const fileSizeMB = getFileSizeMB(inputFilePath);
    let chunksToProcess = [];

    if (fileSizeMB < MAX_CHUNK_SIZE_MB) {
      // Small enough, process directly
      chunksToProcess = [inputFilePath];
    } else {
      // Too large, we need to chunk it
      console.log(`Audio file is ${fileSizeMB.toFixed(2)}MB, chunking it...`);
      chunksToProcess = await chunkAudio(inputFilePath, tempDir, fileId);
    }

    // 3. Process each chunk sequentially with OpenAI
    let fullTranscription = '';
    
    for (let i = 0; i < chunksToProcess.length; i++) {
      const chunkPath = chunksToProcess[i];
      console.log(`Transcribing chunk ${i + 1}/${chunksToProcess.length}...`);
      
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(chunkPath),
        model: 'whisper-1',
      });
      
      fullTranscription += transcription.text + ' ';
    }

    // Clean up temporary files in background
    setTimeout(() => {
      try {
        fs.unlinkSync(inputFilePath);
        if (chunksToProcess.length > 1) {
          chunksToProcess.forEach(f => {
            if (fs.existsSync(f)) fs.unlinkSync(f);
          });
        }
      } catch (cleanupErr) {
        console.error('Failed to clean up temp audio files:', cleanupErr);
      }
    }, 5000);

    return res.json({ text: fullTranscription.trim() });

  } catch (error) {
    console.error('Transcription error:', error);
    
    // Clean up on error
    if (fs.existsSync(inputFilePath)) fs.unlinkSync(inputFilePath);
    
    return res.status(500).json({ 
      error: 'Failed to transcribe audio.',
      details: error.message 
    });
  }
});

module.exports = router;
