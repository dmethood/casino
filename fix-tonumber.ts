#!/usr/bin/env tsx

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function getAllTsFiles(dir: string): string[] {
  const files: string[] = [];
  
  function traverse(currentDir: string) {
    const items = readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = join(currentDir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(fullPath);
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

console.log('🔧 Fixing all  calls for SQLite compatibility...');

const tsFiles = getAllTsFiles('.');
let fixedFiles = 0;
let totalFixes = 0;

for (const file of tsFiles) {
  try {
    let content = readFileSync(file, 'utf-8');
    const originalContent = content;
    
    // Fix  calls
    content = content.replace(/\.toNumber\(\)/g, '');
    
    // Fix specific patterns
    content = content.replace(/\(\s*([^)]+)\s*\)\s*\|\|\s*0/g, '($1 || 0)');
    
    if (content !== originalContent) {
      writeFileSync(file, content);
      fixedFiles++;
      const fixes = (originalContent.match(/\.toNumber\(\)/g) || []).length;
      totalFixes += fixes;
      console.log(`  ✅ Fixed ${fixes} calls in ${file}`);
    }
  } catch (error) {
    console.log(`  ⚠️ Skipped ${file}: ${String(error)}`);
  }
}

console.log(`\n🎉 Fixed ${totalFixes}  calls across ${fixedFiles} files`);
console.log('✅ SQLite compatibility complete!');
