const fs = require('fs');
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error("Please run: npm install sharp");
  process.exit(1);
}

sharp('public/fArtboard 1.png')
  .trim()
  .toFile('public/favicon_cropped.png')
  .then(info => {
    console.log('Successfully cropped the image!', info);
  })
  .catch(err => {
    console.error('Error cropping image:', err);
  });
