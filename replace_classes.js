const fs = require('fs');
const path = require('path');

const replacements = [
  // honey -> gold
  { regex: /bg-honey-primary/g, replacement: "bg-maroon-primary" }, // Let's make primary buttons maroon
  { regex: /hover:bg-honey-dark/g, replacement: "hover:bg-maroon-dark" },
  { regex: /text-honey-primary/g, replacement: "text-maroon-primary" },
  { regex: /text-honey-dark/g, replacement: "text-maroon-dark" },
  { regex: /border-honey-primary/g, replacement: "border-maroon-primary" },
  { regex: /honey/g, replacement: "gold" }, // fallback for other honey usages

  // midnight -> surface
  { regex: /bg-midnight-lighter/g, replacement: "bg-surface-lighter" },
  { regex: /bg-midnight/g, replacement: "bg-surface" },
  { regex: /border-midnight-border/g, replacement: "border-surface-border" },
  { regex: /text-midnight-text/g, replacement: "text-surface-text" },
  { regex: /text-midnight/g, replacement: "text-surface-text" },

  // fix text-white issues on light surface backgrounds
  // We can't safely replace all text-white. Let's just fix the hover colors that were hover:text-white on the transparent/midnight background.
  // E.g. hover:text-white transition-colors
  { regex: /hover:text-white/g, replacement: "hover:text-maroon-primary" },
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;
  
  for (const r of replacements) {
    newContent = newContent.replace(r.regex, r.replacement);
  }
  
  // Custom manual replacements for specific layout fixes
  if (filePath.includes('Header.tsx')) {
    // nothing special needed if we replaced hover:text-white
  }
  
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

function traverseDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (['node_modules', '.git', '.next', 'out'].includes(file)) continue;
    
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      traverseDirectory(fullPath);
    } else {
      const ext = path.extname(fullPath);
      if (['.js', '.ts', '.tsx', '.jsx', '.css'].includes(ext)) {
        processFile(fullPath);
      }
    }
  }
}

traverseDirectory(path.join(process.cwd(), 'src'));
console.log('Class replacement done');
