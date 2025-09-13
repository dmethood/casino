#!/usr/bin/env tsx

/**
 * Fix JSON object assignments to string fields for SQLite compatibility
 */

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

console.log('🔧 Fixing JSON object to string assignments for SQLite...');

const tsFiles = getAllTsFiles('.');
let fixedFiles = 0;

for (const file of tsFiles) {
  try {
    let content = readFileSync(file, 'utf-8');
    const originalContent = content;
    
    // Fix details object assignments
    content = content.replace(
      /details:\s*\{([^}]+)\}/g, 
      'details: JSON.stringify({$1})'
    );
    
    // Fix complianceFlags array assignments
    content = content.replace(
      /complianceFlags:\s*result\.reasons,/g,
      'complianceFlags: JSON.stringify(result.reasons),'
    );
    
    // Fix backupCodes array assignments
    content = content.replace(
      /backupCodes:\s*encryptedBackupCodes,/g,
      'backupCodes: JSON.stringify(encryptedBackupCodes),'
    );
    
    // Fix documentsRequired array assignments
    content = content.replace(
      /documentsRequired: JSON.stringify(\s*([^),]+),/g,
      'documentsRequired: JSON.stringify(JSON.stringify($1)),'
    );
    
    // Fix verificationResults object assignments
    content = content.replace(
      /verificationResults:\s*result,/g,
      'verificationResults: JSON.stringify(result),'
    );
    
    // Fix lastUpdated field (not in schema)
    content = content.replace(
      /lastUpdated:\s*new Date\(\)/g,
      'updatedAt: new Date()'
    );
    
    // Fix String(error) for unknown type
    content = content.replace(
      /error\.message/g,
      'String(error)'
    );
    
    if (content !== originalContent) {
      writeFileSync(file, content);
      fixedFiles++;
      console.log(`  ✅ Fixed JSON/string issues in ${file}`);
    }
  } catch (error) {
    console.log(`  ⚠️ Skipped ${file}: ${String(error)}`);
  }
}

console.log(`\n🎉 Fixed JSON/string conversion issues in ${fixedFiles} files`);
console.log('✅ SQLite string field compatibility complete!');
