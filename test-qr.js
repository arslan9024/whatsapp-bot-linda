import QRCode from 'qrcode';

const testData = 'https://v.whatsapp.com/RXjJWp01234567890';

try {
  const qr = QRCode.create(testData);
  
  console.log('\n=== QRCode BitMatrix ===');
  const bitMatrix = qr.modules;
  console.log('Size:', bitMatrix.size);
  console.log('Data keys count:', Object.keys(bitMatrix.data).length);
  
  // BitMatrix data is indexed as string keys in a flat structure
  // For a 29x29 matrix, access is: data[y * size + x]
  
  console.log('\n=== Rendering QR Code ===\n');
  const size = bitMatrix.size;
  const dataObj = bitMatrix.data;
  
  for (let y = 0; y < size; y++) {
    let line = '';
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      // Check if this index has a truthy value
      const bit = dataObj[idx];
      line += bit ? '█' : ' ';
    }
    console.log(line);
  }
  
  console.log('\n✅ QR code rendered successfully!');
} catch (error) {
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
}




