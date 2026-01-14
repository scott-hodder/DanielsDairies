#!/usr/bin/env node

/**
 * MODULE MIGRATION SCRIPT
 * 
 * Converts modules from localStorage/cached star logic to Supabase DB-powered format
 * 
 * Usage:
 *   node migrate-module.js input.html output.html MODULE_CODE
 * 
 * Example:
 *   node migrate-module.js luna-original.html luna-migrated.html MODULE3
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ============================================
// CONFIGURATION
// ============================================

const MIGRATION_CONFIG = {
  // Import statement to add
  dbImport: `import { initializeModule, loadStarsFromDB, saveStarsToDB, awardSingleStar, getChildName, getChildId, completeModuleDB } from './modules/module-db.js';`,
  
  // Functions to remove (localStorage-based)
  functionsToRemove: [
    'loadStars',
    'saveStars', 
    'updateStarDisplay',
    'addStars',
    'deductStars',
    'saveProgress'
  ],
  
  // Variables to remove
  variablesToRemove: [
    'totalStars',
    'completedActivities'
  ]
};

// ============================================
// MAIN MIGRATION FUNCTION
// ============================================

export function migrateModule(inputPath, outputPath, moduleCode) {




  
  // Read input file
  let html = fs.readFileSync(inputPath, 'utf8');
  
  // Step 1: Update module code constant
  html = updateModuleCode(html, moduleCode);
  
  // Step 2: Add DB imports
  html = addDBImports(html);
  
  // Step 3: Replace star initialization
  html = replaceStarInitialization(html);
  
  // Step 4: Replace star display updates
  html = replaceStarDisplayUpdates(html);
  
  // Step 5: Replace star awarding logic
  html = replaceStarAwarding(html);
  
  // Step 6: Remove old localStorage functions
  html = removeOldFunctions(html);
  
  // Step 7: Update completion logic
  html = updateCompletionLogic(html);
  
  // Step 8: Clean up old variables
  html = cleanupOldVariables(html);
  
  // Write output file
  fs.writeFileSync(outputPath, html, 'utf8');
  







}

// ============================================
// MIGRATION HELPERS
// ============================================

function updateModuleCode(html, moduleCode) {

  
  // Replace WORKBOOK_ID constant
  html = html.replace(
    /const\s+WORKBOOK_ID\s*=\s*['"][^'"]*['"]\s*;/,
    `const WORKBOOK_ID = '${moduleCode}';`
  );
  
  return html;
}

function addDBImports(html) {

  
  // Try to find script type="module" first
  let scriptTagRegex = /<script\s+type="module">/;
  
  if (scriptTagRegex.test(html)) {
    html = html.replace(
      scriptTagRegex,
      `<script type="module">\n        ${MIGRATION_CONFIG.dbImport}\n`
    );
  } else {
    // If no type="module", convert regular <script> to module and add import
    scriptTagRegex = /<script>/;
    if (scriptTagRegex.test(html)) {
      html = html.replace(
        scriptTagRegex,
        `<script type="module">\n        ${MIGRATION_CONFIG.dbImport}\n`
      );

    } else {
      console.warn('   ⚠️  Warning: Could not find script tag to add imports');
    }
  }
  
  return html;
}

function replaceStarInitialization(html) {

  
  // Replace totalStars initialization with DB call
  const oldInit = /let\s+totalStars\s*=\s*0\s*;[\s\S]*?loadStars\(\)\s*;/;
  const newInit = `let totalStars = 0;
        
        // Initialize module and load stars from database
        async function initializeStars() {
            try {
                await initializeModule(WORKBOOK_ID);
                totalStars = await loadStarsFromDB(WORKBOOK_ID);
                updateStarDisplay();

            } catch (error) {
                console.error('[Module] Error initializing stars:', error);
                totalStars = 0;
                updateStarDisplay();
            }
        }
        
        initializeStars();`;
  
  html = html.replace(oldInit, newInit);
  
  return html;
}

function replaceStarDisplayUpdates(html) {

  
  // Replace updateStarDisplay function
  const oldDisplay = /function\s+updateStarDisplay\(\)\s*\{[\s\S]*?\n\s*\}/;
  const newDisplay = `function updateStarDisplay() {
            const starCount = document.getElementById('starCount');
            if (starCount) starCount.textContent = totalStars;
            
            const modalCount = document.getElementById('modalStarCount');
            if (modalCount) modalCount.textContent = totalStars;
            
            const currentWorkbook = document.getElementById('currentWorkbookStars');
            if (currentWorkbook) currentWorkbook.textContent = totalStars;
            
            const progressStars = document.getElementById('progressStars');
            if (progressStars) progressStars.textContent = totalStars;
        }`;
  
  html = html.replace(oldDisplay, newDisplay);
  
  return html;
}

function replaceStarAwarding(html) {

  
  // Replace activity completion that awards stars
  // Pattern: totalStars += 1; saveStars(); saveProgress();
  const awardPattern = /totalStars\s*\+=\s*1\s*;[\s\S]*?saveStars\(\)\s*;[\s\S]*?saveProgress\(\)\s*;/g;
  
  html = html.replace(awardPattern, `await awardSingleStar(WORKBOOK_ID);
                totalStars = await loadStarsFromDB(WORKBOOK_ID);
                updateStarDisplay();`);
  
  // Also handle direct totalStars += amount patterns
  html = html.replace(
    /totalStars\s*\+=\s*(\d+)\s*;[\s\S]*?saveStars\(\)\s*;/g,
    (match, amount) => {
      if (amount === '1') {
        return `await awardSingleStar(WORKBOOK_ID);\n                totalStars = await loadStarsFromDB(WORKBOOK_ID);\n                updateStarDisplay();`;
      }
      // For multiple stars, call awardSingleStar multiple times
      return `for (let i = 0; i < ${amount}; i++) {\n                    await awardSingleStar(WORKBOOK_ID);\n                }\n                totalStars = await loadStarsFromDB(WORKBOOK_ID);\n                updateStarDisplay();`;
    }
  );
  
  return html;
}

function removeOldFunctions(html) {

  
  // Remove loadStars function
  html = html.replace(/function\s+loadStars\(\)\s*\{[\s\S]*?\n\s*\}\n/g, '');
  
  // Remove saveStars function  
  html = html.replace(/function\s+saveStars\(\)\s*\{[\s\S]*?\n\s*\}\n/g, '');
  
  // Remove saveProgress function
  html = html.replace(/function\s+saveProgress\(\)\s*\{[\s\S]*?\n\s*\}\n/g, '');
  
  // Remove addStars function
  html = html.replace(/function\s+addStars\([^)]*\)\s*\{[\s\S]*?\n\s*\}\n/g, '');
  
  // Remove deductStars function
  html = html.replace(/function\s+deductStars\([^)]*\)\s*\{[\s\S]*?\n\s*\}\n/g, '');
  
  return html;
}

function updateCompletionLogic(html) {

  
  // Find "Complete Module" button handler
  // Replace with completeModuleDB call
  const completePattern = /document\.getElementById\(['"]completeModuleBtn['"]\)\.addEventListener\(['"]click['"],\s*(?:async\s+)?function\(\)\s*\{[\s\S]*?\}\);/;
  
  const newComplete = `document.getElementById('completeModuleBtn').addEventListener('click', async function() {
            try {
                await completeModuleDB(WORKBOOK_ID);
                alert('🎉 Module completed! Your progress has been saved.');
                window.location.href = '/module.html';
            } catch (error) {
                console.error('[Module] Error completing module:', error);
                alert('There was an error completing the module. Please try again.');
            }
        });`;
  
  if (completePattern.test(html)) {
    html = html.replace(completePattern, newComplete);
  }
  
  return html;
}

function cleanupOldVariables(html) {

  
  // Remove completedActivities initialization
  html = html.replace(/let\s+completedActivities\s*=\s*\[\]\s*;/g, '');
  
  // Remove localStorage references
  html = html.replace(/localStorage\.getItem\(['"]cbtWorkbook[^'"]*['"]\)/g, '/* localStorage removed */');
  html = html.replace(/localStorage\.setItem\(['"]cbtWorkbook[^'"]*['"][^\)]*\)/g, '/* localStorage removed */');
  
  return html;
}

// ============================================
// CLI INTERFACE
// ============================================

function showUsage() {
  console.log(`
📚 Module Migration Script

Usage:
  node migrate-module.js <input.html> <output.html> <MODULE_CODE>

Example:
  node migrate-module.js luna-original.html luna-migrated.html MODULE3

Arguments:
  input.html    - Path to the original module file (with localStorage)
  output.html   - Path for the migrated output file (with DB integration)
  MODULE_CODE   - Module identifier (e.g., MODULE3, MODULE4)

What this script does:
  ✓ Replaces localStorage with Supabase database calls
  ✓ Updates star awarding to use awardSingleStar()
  ✓ Adds database imports
  ✓ Removes old caching logic
  ✓ Updates module completion to use completeModuleDB()
  `);
}

// ============================================
// RUN
// ============================================

const __filename = fileURLToPath(import.meta.url);
const invokedScript = process.argv[1] ? path.resolve(process.argv[1]) : null;

if (invokedScript && invokedScript === __filename) {
  const args = process.argv.slice(2);

  if (args.length !== 3) {
    showUsage();
    process.exit(1);
  }

  const [inputPath, outputPath, moduleCode] = args;

  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Error: Input file not found: ${inputPath}`);
    process.exit(1);
  }

  if (!/^MODULE\d+$/i.test(moduleCode)) {
    console.warn(`⚠️  Warning: Module code "${moduleCode}" doesn't match expected format (MODULE#)`);
    console.warn('   Continuing anyway...');
  }

  try {
    migrateModule(inputPath, outputPath, moduleCode);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}