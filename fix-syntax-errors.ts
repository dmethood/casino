#!/usr/bin/env tsx

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function getAllTsFiles(dir: string): string[] {
  const files: string[] = [];
  
  function traverse(currentDir: string) {
    const items = readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = join(currentDir, item);
      
      try {
        const stat = statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          traverse(fullPath);
        } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
          files.push(fullPath);
        }
      } catch (error) {
        // Skip files that can't be accessed
      }
    }
  }
  
  traverse(dir);
  return files;
}

console.log('🔧 Fixing syntax errors from automatic toNumber removal...');

const tsFiles = getAllTsFiles('.');
let fixedFiles = 0;

for (const file of tsFiles) {
  try {
    let content = readFileSync(file, 'utf-8');
    const originalContent = content;
    
    // Fix the broken syntax patterns
    content = content.replace(/\(\s*([^)]+)\s*as\s+any\)\?\s*\|\|\s*0/g, '($1 as any) || 0');
    content = content.replace(/\.amount\?\s*\|\|\s*0/g, '.amount || 0');
    content = content.replace(/\?\s*\|\|\s*0/g, ' || 0');
    
    if (content !== originalContent) {
      writeFileSync(file, content);
      fixedFiles++;
      console.log(`  ✅ Fixed syntax in ${file}`);
    }
  } catch (error) {
    console.log(`  ⚠️ Skipped ${file}: ${String(error)}`);
  }
}

console.log(`\n🎉 Fixed syntax errors in ${fixedFiles} files`);
console.log('✅ TypeScript syntax corrected!');
