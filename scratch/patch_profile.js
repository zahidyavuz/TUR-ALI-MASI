const fs = require('fs');
const path = 'app/profile/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Find and replace the file input block using line detection
const lines = content.split('\n');
let startIdx = -1;
let endIdx = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('type="file"') && lines[i].includes('handleImageUpload')) {
    startIdx = i;
  }
  if (startIdx !== -1 && lines[i].includes('</button>') && i > startIdx) {
    endIdx = i;
    break;
  }
}

if (startIdx === -1) {
  console.log('Block not found. Lines around 240:');
  for (let i = 238; i < 247; i++) console.log(i, ':', lines[i]);
} else {
  console.log('Found block at lines', startIdx, '-', endIdx);
  const replacement = [
    '',
    '                            <div className="relative z-10 mt-6">',
    '                                <SecureFileUpload',
    '                                    onFileAccepted={handleSecureImageUpload}',
    '                                    currentImageUrl={profileImage}',
    '                                    label="Fotoğrafı Değiştir"',
    '                                    variant="round"',
    '                                />',
    '                            </div>'
  ];
  lines.splice(startIdx, endIdx - startIdx + 1, ...replacement);
  fs.writeFileSync(path, lines.join('\n'), 'utf8');
  console.log('SUCCESS');
}
