import fs from 'fs';
import path from 'path';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ffmpegPath = ffmpegInstaller.path;

// set ffmpeg binary path
ffmpeg.setFfmpegPath(ffmpegPath);

class StickerConverter {
  constructor() {
    this.tempDir = path.join(__dirname, '../temp');
    this.ensureTempDir();
  }

  ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async convertStickerToImage(stickerBuffer) {
    const tempPath = path.join(this.tempDir, `sticker_${Date.now()}.webp`);
    const outputPath = path.join(this.tempDir, `image_${Date.now()}.jpg`);

    try {
      // save input sticker
      await fs.promises.writeFile(tempPath, stickerBuffer);

      // run ffmpeg conversion
      await new Promise((resolve, reject) => {
        ffmpeg(tempPath)
          .inputFormat('webp') // parse input as webp
          .outputOptions(['-vf scale=512:512:force_original_aspect_ratio=decrease'])
          .toFormat('jpeg')    // convert to JPEG (more reliable than PNG in bundled ffmpeg)
          .save(outputPath)
          .on('end', resolve)
          .on('error', reject);
      });

      // read converted image
      return await fs.promises.readFile(outputPath);
    } catch (error) {
      console.error('Conversion error:', error);
      throw new Error('Failed to convert sticker to image: ' + error.message);
    } finally {
      // cleanup
      if (fs.existsSync(tempPath)) await fs.promises.unlink(tempPath).catch(() => {});
      if (fs.existsSync(outputPath)) await fs.promises.unlink(outputPath).catch(() => {});
    }
  }
}

export default new StickerConverter();
