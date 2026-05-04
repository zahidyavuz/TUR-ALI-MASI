
import fs from 'fs';

const content = fs.readFileSync('c:\\Users\\Melih\\Desktop\\TUR-ALI-MASI-main\\app\\page.tsx', 'utf8');

let openBraces = 0;
let openParens = 0;
let openBrackets = 0;

for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '{') openBraces++;
    else if (char === '}') openBraces--;
    else if (char === '(') openParens++;
    else if (char === ')') openParens--;
    else if (char === '[') openBrackets++;
    else if (char === ']') openBrackets--;
    
    if (openBraces < 0) console.log('Extra } at position', i);
    if (openParens < 0) console.log('Extra ) at position', i);
    if (openBrackets < 0) console.log('Extra ] at position', i);
}

console.log('Final counts:');
console.log('Braces:', openBraces);
console.log('Parens:', openParens);
console.log('Brackets:', openBrackets);
