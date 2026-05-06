const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, 'app', 'page.tsx');
let pageContent = fs.readFileSync(pagePath, 'utf8');

// 1. Extract liveRates logic
const liveRatesStart = pageContent.indexOf('  // Canlı Kur Simülasyonu State');
let liveRatesEnd = pageContent.indexOf('  useEffect(() => {\n    const trustTimer = setInterval');
if (liveRatesEnd === -1) {
    liveRatesEnd = pageContent.indexOf('  useEffect(() => {\n    const handleClickOutside');
}
if (liveRatesStart === -1 || liveRatesEnd === -1) {
    console.error("Could not find liveRates logic");
    process.exit(1);
}

const liveRatesLogic = pageContent.substring(liveRatesStart, liveRatesEnd);

// 2. Extract Footer JSX
const footerStart = pageContent.indexOf('      {/* Kapsamlı Alt Bilgi (Footer) - Tourradar Tarzı */}');
const footerEndStr = '      </footer >\n';
let footerEnd = pageContent.indexOf(footerEndStr, footerStart);
if (footerEnd === -1) {
    console.error("Could not find footer end");
    process.exit(1);
}
footerEnd += footerEndStr.length;

const footerJSX = pageContent.substring(footerStart, footerEnd);

// 3. Create Footer.tsx
const footerComponentContent = `"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Footer() {
${liveRatesLogic}
  return (
    <>
${footerJSX}
    </>
  );
}
`;

fs.writeFileSync(path.join(__dirname, 'app', 'components', 'Footer.tsx'), footerComponentContent, 'utf8');

// 4. Remove from page.tsx
pageContent = pageContent.substring(0, liveRatesStart) + pageContent.substring(liveRatesEnd);
const newFooterStart = pageContent.indexOf('      {/* Kapsamlı Alt Bilgi (Footer) - Tourradar Tarzı */}');
const newFooterEnd = pageContent.indexOf(footerEndStr, newFooterStart) + footerEndStr.length;
pageContent = pageContent.substring(0, newFooterStart) + pageContent.substring(newFooterEnd);

fs.writeFileSync(pagePath, pageContent, 'utf8');

// 5. Update layout.tsx
const layoutPath = path.join(__dirname, 'app', 'layout.tsx');
let layoutContent = fs.readFileSync(layoutPath, 'utf8');

if (!layoutContent.includes('import Footer')) {
    layoutContent = layoutContent.replace(
        "import Chatbot from \"./components/Chatbot\";",
        "import Chatbot from \"./components/Chatbot\";\nimport Footer from \"./components/Footer\";"
    );
    
    layoutContent = layoutContent.replace(
        "<Chatbot />",
        "<Chatbot />\n                  <Footer />"
    );
    
    fs.writeFileSync(layoutPath, layoutContent, 'utf8');
}

console.log("Footer extraction successful.");
