/**
 * Browser-Compatible Module Conversion Script
 * 
 * This is a browser-safe version of convert-module.js that can be imported
 * in the admin panel for automatic module conversion on upload.
 * 
 * It performs the same conversions but without Node.js-specific dependencies.
 */

// Configuration
const CONFIG = {
    // Database imports to add
    dbImports: `import {
            initializeModule,
            loadStarsFromDB,
            saveStarsToDB,
            awardSingleStar,
            getChildName,
            completeModuleDB
        } from "./module-db.js";`,
    
    // Placeholder constants
    placeholderConstants: `
        // Module identification - these will be replaced during sync
        const WORKBOOK_ID = '__WORKBOOK_ID__';
        const MODULE_CODE = '__MODULE_CODE__';`,
    
    // Standard storage key patterns
    storageKeys: {
        formData: 'cbtWorkbookData_',
        progress: 'cbtWorkbookProgress_',
        stars: 'cbtWorkbookStars'
    }
};

function findInlineScriptTag(html) {
    const scriptRegex = /<script\b[^>]*>/gi;
    const inlineScripts = [];
    let match;
    while ((match = scriptRegex.exec(html)) !== null) {
        const tag = match[0];
        if (/src\s*=/.test(tag)) continue;
        inlineScripts.push({ tag, index: match.index });
    }
    return inlineScripts.length ? inlineScripts[inlineScripts.length - 1] : null;
}

function ensureModuleInlineScript(html, importBlock) {
    const inlineScript = findInlineScriptTag(html);
    if (!inlineScript) {
        console.warn('[ConvertModule] No inline script found to inject imports');
        return { html, injected: false };
    }

    let { tag } = inlineScript;
    const { index } = inlineScript;

    if (/type\s*=/.test(tag)) {
        tag = tag.replace(/type\s*=\s*["'][^"']*["']/i, 'type="module"');
    } else {
        tag = tag.replace('<script', '<script type="module"');
    }

    let updated = html.slice(0, index) + tag + html.slice(index + inlineScript.tag.length);
    const insertPos = index + tag.length;
    updated = `${updated.slice(0, insertPos)}\n${importBlock}\n${updated.slice(insertPos)}`;
    return { html: updated, injected: true };
}

/**
 * Main conversion function
 * @param {string} htmlContent - The HTML content to convert
 * @returns {string} - The converted HTML content
 */
export function convertModule(htmlContent) {
    let converted = htmlContent;
    const changes = [];
    
    try {
        // 1. Add database imports if not present
        if (!converted.includes('from "./module-db.js"')) {
            const result = ensureModuleInlineScript(converted, CONFIG.dbImports);
            converted = result.html;
            if (result.injected) {
                changes.push('Added database imports');
            }
        }
        
        // 2. Add placeholder constants if not present
        if (!converted.includes('WORKBOOK_ID') && !converted.includes('MODULE_CODE')) {
            // Find where to insert (after imports, before other code)
            const importMatch = converted.match(/import\s+{[^}]+}\s+from\s+["'][^"']+["'];/g);
            if (importMatch) {
                const lastImport = importMatch[importMatch.length - 1];
                const insertPos = converted.indexOf(lastImport) + lastImport.length;
                converted = converted.slice(0, insertPos) + '\n' + CONFIG.placeholderConstants + '\n' + converted.slice(insertPos);
                changes.push('Added placeholder constants');
            }
        }
        
        // 3. Replace localStorage patterns with database-compatible versions
        
        // Replace star loading patterns
        converted = converted.replace(
            /localStorage\.getItem\(['"]cbtWorkbookStars['"]\)/g,
            'await loadStarsFromDB()'
        );
        changes.push('Updated star loading');
        
        // Replace star saving patterns
        converted = converted.replace(
            /localStorage\.setItem\(['"]cbtWorkbookStars['"],\s*JSON\.stringify\([^)]+\)\)/g,
            'await saveStarsToDB(totalStars)'
        );
        changes.push('Updated star saving');
        
        // 4. Standardize storage keys
        
        // Find custom storage key patterns and replace with standard ones
        const customKeyPatterns = [
            /localStorage\.(get|set)Item\([`'"]([^`'"]+Data)[`'"]_?\$\{[^}]+\}/g,
            /localStorage\.(get|set)Item\([`'"]([^`'"]+Progress)[`'"]_?\$\{[^}]+\}/g
        ];
        
        customKeyPatterns.forEach(pattern => {
            const matches = converted.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    if (match.includes('Data')) {
                        const replacement = match.replace(/[`'"]([^`'"]+Data)[`'"]_?\$\{[^}]+\}/, '`cbtWorkbookData_${MODULE_CODE}`');
                        converted = converted.replace(match, replacement);
                    } else if (match.includes('Progress')) {
                        const replacement = match.replace(/[`'"]([^`'"]+Progress)[`'"]_?\$\{[^}]+\}/, '`cbtWorkbookProgress_${MODULE_CODE}`');
                        converted = converted.replace(match, replacement);
                    }
                });
                changes.push('Standardized storage keys');
            }
        });
        
        // 5. Fix template literal issues (nested backticks)
        
        // Replace escaped backticks in template literals with string concatenation
        const templateLiteralPattern = /value=["']\$\{formData\[`([^`]+)`\][^}]*\}["']/g;
        if (templateLiteralPattern.test(converted)) {
            converted = converted.replace(
                /value=["']\$\{formData\[`([^`]+)`\]([^}]*)\}["']/g,
                (match, key, rest) => {
                    return `value="\${formData['${key}']${rest}}"`;
                }
            );
            changes.push('Fixed nested template literals');
        }
        
        // 6. Add module initialization call if not present
        if (!converted.includes('initializeModule')) {
            // Find the DOMContentLoaded or window.onload
            const domReadyPattern = /(document\.addEventListener\(['"]DOMContentLoaded['"],\s*(?:async\s+)?function\s*\(\)\s*\{)/;
            const match = converted.match(domReadyPattern);
            if (match) {
                const insertPos = converted.indexOf(match[1]) + match[1].length;
                converted = converted.slice(0, insertPos) + '\n            await initializeModule(WORKBOOK_ID, MODULE_CODE);\n' + converted.slice(insertPos);
                changes.push('Added module initialization');
            }
        }
        
        // 7. Replace module completion calls
        if (!converted.includes('completeModuleDB')) {
            converted = converted.replace(
                /localStorage\.setItem\(['"]moduleComplete['"],\s*['"]true['"]\)/g,
                'await completeModuleDB()'
            );
            changes.push('Added database completion tracking');
        }
        
        // 8. Add/update header with Home button
        converted = addHeaderWithHomeButton(converted);
        changes.push('Added Home button to header');
        
        // 9. Move module title from header to first page
        converted = moveTitleToFirstPage(converted);
        changes.push('Moved title to first page');
        
        // 10. Inject child name into "Your Name" placeholders
        converted = injectChildName(converted);
        changes.push('Added dynamic child name injection');

        // 11. Ensure async contexts for awaited code
        converted = makeDomReadyHandlersAsync(converted);
        converted = ensureAsyncFunctionDeclarations(converted, ASYNC_FUNCTION_NAMES);
        

        return converted;
        
    } catch (error) {
        console.error('[ConvertModule] Conversion error:', error);
        throw new Error('Module conversion failed: ' + error.message);
    }
}

/**
 * Inject child name into "Your Name" placeholders
 */
function injectChildName(html) {
    // Add initialization code to populate child name on load
    const initCode = `
        // Populate child name on page load
        async function populateChildName() {
            const childName = await getChildName();
            
            // Replace placeholder text
            const nameElements = document.querySelectorAll('input[placeholder="Your Name"]');
            nameElements.forEach(el => {
                el.placeholder = childName;
                el.value = childName;
            });
            
            // Replace text content
            const textElements = Array.from(document.querySelectorAll('*'))
                .filter(el => el.childNodes.some(node => node.nodeType === 3 && node.textContent.includes('Your Name')));
            textElements.forEach(el => {
                el.textContent = el.textContent.replace('Your Name', childName);
            });
        }
        
        // Call on DOMContentLoaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', populateChildName);
        } else {
            populateChildName();
        }
    `;
    
    // Add the initialization code to the script
    const scriptMatch = html.match(/<script[^>]*type=["']module["'][^>]*>/i);
    if (scriptMatch) {
        const insertPos = scriptMatch.index + scriptMatch[0].length;
        html = html.slice(0, insertPos) + initCode + html.slice(insertPos);
    }
    
    return html;
}

/**
 * Add or update header with Home button
 */
function addHeaderWithHomeButton(html) {
    // Check if there's already a header
    const headerMatch = html.match(/<header[^>]*>[\s\S]*?<\/header>/i);
    
    if (headerMatch) {
        // Update existing header to add Home button if it doesn't have one
        const headerContent = headerMatch[0];
        
        if (!headerContent.includes('Home') && !headerContent.includes('home')) {
            // Add Home button to the header
            const homeButton = '<button class="home-btn" onclick="window.location.href=\'/dashboard.html\'" style="padding: 8px 16px; background: #4c6c96; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">🏠 Home</button>';
            const updatedHeader = headerContent.replace('</header>', homeButton + '</header>');
            html = html.replace(headerContent, updatedHeader);
        }
    } else {
        // No header found, add one
        const bodyMatch = html.match(/<body[^>]*>/i);
        if (bodyMatch) {
            const newHeader = `<header style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; background: #f8f9fa; border-bottom: 1px solid #e0e0e0;">
                <div style="font-size: 18px; font-weight: 600; color: #333;">Module</div>
                <button class="home-btn" onclick="window.location.href='/dashboard.html'" style="padding: 8px 16px; background: #4c6c96; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">🏠 Home</button>
            </header>`;
            const insertPos = bodyMatch.index + bodyMatch[0].length;
            html = html.slice(0, insertPos) + '\n' + newHeader + '\n' + html.slice(insertPos);
        }
    }
    
    return html;
}

/**
 * Move module title from header to first page
 */
function moveTitleToFirstPage(html) {
    // Look for h2 elements that are likely module titles (usually in the main content area)
    // These are typically styled with orange/gold color and appear before the main content
    const h2Matches = html.match(/<h2[^>]*>([^<]+)<\/h2>/gi);
    
    if (h2Matches && h2Matches.length > 0) {
        // The first h2 is likely the module title
        const titleMatch = h2Matches[0];
        const titleText = titleMatch.match(/>([^<]+)</)[1];
        
        // Check if this looks like a module title (not too short, not a section heading)
        if (titleText && titleText.length > 5 && !titleText.toLowerCase().includes('page')) {
            // Remove the title from its current location
            html = html.replace(titleMatch, '');
            
            // Find the first page/section content and add the title there
            const pageMatch = html.match(/<div[^>]*class="[^"]*page[^"]*"[^>]*>/i);
            
            if (pageMatch) {
                const insertPos = pageMatch.index + pageMatch[0].length;
                const titleElement = `\n<h1 style="text-align: center; margin: 20px 0; font-size: 28px; color: #333; font-weight: 700;">${titleText}</h1>\n`;
                html = html.slice(0, insertPos) + titleElement + html.slice(insertPos);
            }
        }
    }
    
    return html;
}

/**
 * Generate a report of what would be changed (dry run)
 * @param {string} htmlContent - The HTML content to analyze
 * @returns {object} - Report of potential changes
 */
export function generateReport(htmlContent) {
    const report = {
        hasDbImports: htmlContent.includes('from "./module-db.js"'),
        hasPlaceholders: htmlContent.includes('WORKBOOK_ID') || htmlContent.includes('MODULE_CODE'),
        usesLocalStorage: htmlContent.includes('localStorage'),
        hasNestedTemplates: /value=["']\$\{formData\[`([^`]+)`\]/.test(htmlContent),
        hasInitialization: htmlContent.includes('initializeModule'),
        hasCompletion: htmlContent.includes('completeModuleDB'),
        recommendations: []
    };
    
    if (!report.hasDbImports) {
        report.recommendations.push('Add database imports');
    }
    if (!report.hasPlaceholders) {
        report.recommendations.push('Add WORKBOOK_ID and MODULE_CODE placeholders');
    }
    if (report.hasNestedTemplates) {
        report.recommendations.push('Fix nested template literals');
    }
    if (!report.hasInitialization) {
        report.recommendations.push('Add module initialization');
    }
    if (!report.hasCompletion) {
        report.recommendations.push('Add database completion tracking');
    }
    
    return report;
}

// Export for browser use
export default {
    convertModule,
    generateReport
};
