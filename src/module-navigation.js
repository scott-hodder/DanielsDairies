/**
 * Module Navigation Helper
 * 
 * Use this to generate correct URLs for module links.
 * Handles both production (static files) and development (dynamic loading).
 */

/**
 * Get the URL for a module
 * 
 * @param {string} moduleCode - The module code (e.g., 'MOD_MK4Y8HAE')
 * @param {object} params - Additional parameters
 * @param {string} params.childId - Child ID
 * @param {string} params.moduleId - Module ID (optional)
 * @param {string} params.parentUserId - Parent user ID (optional)
 * @returns {string} Full URL to the module
 * 
 * @example
 * // In your dashboard:
 * const url = getModuleUrl('MOD_ABC123', { childId: 'child-uuid' });
 * window.location.href = url;
 */
export function getModuleUrl(moduleCode, params = {}) {
  const { childId, moduleId, parentUserId } = params;
  
  // Build query string
  const query = new URLSearchParams();
  if (childId) query.set('childId', childId);
  if (moduleId) query.set('moduleId', moduleId);
  if (parentUserId) query.set('parentUserId', parentUserId);
  
  const queryString = query.toString();
  const suffix = queryString ? `?${queryString}` : '';
  
  // In production, use static generated files
  // In development, can use module-viewer for live DB preview
  if (import.meta.env.DEV && import.meta.env.VITE_USE_DYNAMIC_MODULES === 'true') {
    // Development with dynamic loading
    query.set('code', moduleCode);
    return `/module-viewer.html?${query.toString()}`;
  }
  
  // Production: use generated static file
  return `/modules/generated/${moduleCode}.html${suffix}`;
}

/**
 * Navigate to a module
 * 
 * @param {string} moduleCode - The module code
 * @param {object} params - Navigation parameters
 * 
 * @example
 * // On "Start Module" button click:
 * navigateToModule('MOD_ABC123', { childId: currentChildId });
 */
export function navigateToModule(moduleCode, params = {}) {
  const url = getModuleUrl(moduleCode, params);
  window.location.href = url;
}

/**
 * Check if a generated module exists
 * This is useful for showing loading states or fallback UI
 * 
 * @param {string} moduleCode - The module code
 * @returns {Promise<boolean>}
 */
export async function moduleExists(moduleCode) {
  try {
    const response = await fetch(`/modules/generated/${moduleCode}.html`, { 
      method: 'HEAD' 
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get the manifest of generated modules
 * Useful for checking which modules are available
 * 
 * @returns {Promise<object|null>}
 */
export async function getModuleManifest() {
  try {
    const response = await fetch('/modules/generated/manifest.json');
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}