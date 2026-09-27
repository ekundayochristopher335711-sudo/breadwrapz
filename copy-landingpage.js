import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceImage = 'c:\\Users\\USER\\AppData\\Roaming\\Code\\User\\globalStorage\\github.copilot-chat\\copilot-cli-images\\1778012852357-o8k2aesj.jpg';
const destinationImage = path.join(__dirname, 'public', 'images', 'landingpage.png');

try {
  fs.copyFileSync(sourceImage, destinationImage);
  console.log('✓ Image successfully copied to public/images/landingpage.png');
} catch (error) {
  console.error('✗ Error copying image:', error.message);
  process.exit(1);
}
