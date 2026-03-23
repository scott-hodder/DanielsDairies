import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function cropImage() {
  try {
    const inputPath = path.join(__dirname, 'public', 'images', 'characters', 'daniel-wave.webp');
    
    // Get current dimensions
    const metadata = await sharp(inputPath).metadata();
    const newWidth = metadata.width - 30;
    
    console.log(`Original dimensions: ${metadata.width}x${metadata.height}`);
    
    // Read the image into a buffer, crop it, and write back
    const imageBuffer = fs.readFileSync(inputPath);
    const croppedBuffer = await sharp(imageBuffer)
      .extract({
        left: 15,
        top: 0,
        width: newWidth,
        height: metadata.height
      })
      .toBuffer();
    
    // Write the cropped image back to the same file
    fs.writeFileSync(inputPath, croppedBuffer);
    
    console.log(`Successfully cropped image to ${newWidth}x${metadata.height}`);
  } catch (error) {
    console.error('Error cropping image:', error);
  }
}

cropImage();
