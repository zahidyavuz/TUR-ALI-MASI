/* eslint-disable */
const fs = require('fs');

const content = fs.readFileSync('app/page.tsx', 'utf8');
const lines = content.split('\n');

const startIndex = 286;
const endIndex = 611;

lines.splice(startIndex, endIndex - startIndex, '      <Navbar setShowAgencyModal={setShowAgencyModal} setAgencyTab={setAgencyTab} />');

// Insert import at the top
const importIndex = lines.findIndex(l => l.includes("import { fetchTours }"));
lines.splice(importIndex, 0, "import Navbar from './components/Navbar';");

fs.writeFileSync('app/page.tsx', lines.join('\n'));
