const fs = require('fs');
const buf = Buffer.alloc(24);
const fd = fs.openSync('c:\\Users\\ACER\\Continuum\\public\\Avatar\\Avatar.png', 'r');
fs.readSync(fd, buf, 0, 24, 0);
fs.closeSync(fd);

const width = buf.readUInt32BE(16);
const height = buf.readUInt32BE(20);
console.log(`PNG Dimensions: ${width}x${height}`);
