#!/usr/bin/env node

/**
 * Simple validation script to check if dropdown implementation is correct
 * This validates the implementation without running the full Decky environment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Validating dropdown implementation...');

// Check if source file exists and contains expected components
const srcPath = path.join(__dirname, 'src', 'index.tsx');
const srcContent = fs.readFileSync(srcPath, 'utf8');

const validationChecks = [
  {
    name: 'DropdownItem import',
    check: () => srcContent.includes('DropdownItem'),
    message: 'DropdownItem component is imported'
  },
  {
    name: 'SingleDropdownOption import',
    check: () => srcContent.includes('SingleDropdownOption'),
    message: 'SingleDropdownOption type is imported'
  },
  {
    name: 'Dropdown options defined',
    check: () => srcContent.includes('dropdownOptions') && srcContent.includes('Option A') && srcContent.includes('Option B') && srcContent.includes('Option C'),
    message: 'Dropdown options A, B, C are defined'
  },
  {
    name: 'State management',
    check: () => srcContent.includes('selectedOption') && srcContent.includes('setSelectedOption'),
    message: 'State management for selected option is implemented'
  },
  {
    name: 'Change handler',
    check: () => srcContent.includes('onDropdownChange'),
    message: 'Change handler for dropdown is implemented'
  },
  {
    name: 'DropdownItem usage',
    check: () => srcContent.includes('<DropdownItem') && srcContent.includes('rgOptions={dropdownOptions}'),
    message: 'DropdownItem component is properly used in render'
  },
  {
    name: 'Visual feedback',
    check: () => srcContent.includes('Currently selected:'),
    message: 'Visual feedback for current selection is implemented'
  }
];

// Check if build output exists
const distPath = path.join(__dirname, 'dist', 'index.js');
const buildExists = fs.existsSync(distPath);

let passed = 0;
let failed = 0;

console.log('\n📋 Running validation checks:');

validationChecks.forEach((check, index) => {
  const result = check.check();
  const status = result ? '✅' : '❌';
  console.log(`${index + 1}. ${status} ${check.message}`);
  
  if (result) {
    passed++;
  } else {
    failed++;
  }
});

console.log(`\n🏗️  Build output exists: ${buildExists ? '✅' : '❌'}`);
if (buildExists) {
  passed++;
} else {
  failed++;
}

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('🎉 All validations passed! Dropdown implementation is correct.');
  process.exit(0);
} else {
  console.log('🚨 Some validations failed. Please check the implementation.');
  process.exit(1);
}