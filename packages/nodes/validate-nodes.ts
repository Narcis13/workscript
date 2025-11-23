/**
 * Validation script for node files
 * Checks that all nodes:
 * 1. Extend WorkflowNode
 * 2. Have complete metadata
 * 3. Have execute() method
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ValidationResult {
  file: string;
  valid: boolean;
  errors: string[];
}

const results: ValidationResult[] = [];

function findNodeFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...findNodeFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') && entry.name !== 'index.ts') {
      files.push(fullPath);
    }
  }

  return files;
}

function validateNodeFile(filePath: string): ValidationResult {
  const result: ValidationResult = {
    file: path.relative(path.join(__dirname, 'src'), filePath),
    valid: true,
    errors: []
  };

  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Check if extends WorkflowNode
    const extendsWorkflowNode = /class\s+\w+\s+extends\s+WorkflowNode/.test(content);
    if (!extendsWorkflowNode) {
      result.valid = false;
      result.errors.push('Does not extend WorkflowNode');
    }

    // Check if has metadata property (with optional type annotation)
    const hasMetadata = /metadata\s*:?\s*\w*\s*=\s*{/.test(content);
    if (!hasMetadata) {
      result.valid = false;
      result.errors.push('Missing metadata property');
    } else {
      // Check metadata completeness
      const hasId = /id:\s*['"]/.test(content);
      const hasName = /name:\s*['"]/.test(content);
      const hasVersion = /version:\s*['"]/.test(content);

      if (!hasId) {
        result.valid = false;
        result.errors.push('Metadata missing id field');
      }
      if (!hasName) {
        result.valid = false;
        result.errors.push('Metadata missing name field');
      }
      if (!hasVersion) {
        result.valid = false;
        result.errors.push('Metadata missing version field');
      }
    }

    // Check if has execute() method
    const hasExecute = /async\s+execute\s*\(/.test(content);
    if (!hasExecute) {
      result.valid = false;
      result.errors.push('Missing execute() method');
    }

  } catch (error) {
    result.valid = false;
    result.errors.push(`Error reading file: ${error instanceof Error ? error.message : String(error)}`);
  }

  return result;
}

// Main execution
console.log('🔍 Validating node files...\n');

const srcDir = path.join(__dirname, 'src');
const nodeFiles = findNodeFiles(srcDir);

console.log(`Found ${nodeFiles.length} node files\n`);

for (const file of nodeFiles) {
  const result = validateNodeFile(file);
  results.push(result);

  if (result.valid) {
    console.log(`✅ ${result.file}`);
  } else {
    console.log(`❌ ${result.file}`);
    for (const error of result.errors) {
      console.log(`   - ${error}`);
    }
  }
}

// Summary
console.log('\n' + '='.repeat(50));
const validCount = results.filter(r => r.valid).length;
const invalidCount = results.filter(r => !r.valid).length;

console.log(`\n📊 Validation Summary:`);
console.log(`   Total files: ${results.length}`);
console.log(`   Valid: ${validCount}`);
console.log(`   Invalid: ${invalidCount}`);

if (invalidCount > 0) {
  console.log('\n❌ Validation FAILED - Some nodes have issues');
  process.exit(1);
} else {
  console.log('\n✅ Validation PASSED - All nodes are valid');
  process.exit(0);
}
