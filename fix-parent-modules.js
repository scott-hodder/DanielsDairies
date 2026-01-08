/**
 * One-time fix script to add all existing modules to parent_modules table
 * 
 * This script ensures that all modules in the database are added to the
 * parent_modules table for all parents, so they can activate them for their children.
 * 
 * Usage: Run this from the browser console on the admin or dashboard page
 */

async function fixParentModules() {

    
    try {
        // Get all parents (users)
        const { data: parents, error: parentsError } = await supabase
            .from('parents')
            .select('id, email');
        
        if (parentsError) {
            console.error('[FixParentModules] Error fetching parents:', parentsError);
            return;
        }
        

        
        // Get all modules
        const { data: modules, error: modulesError } = await supabase
            .from('modules')
            .select('id, title, code');
        
        if (modulesError) {
            console.error('[FixParentModules] Error fetching modules:', modulesError);
            return;
        }
        

        
        let added = 0;
        let skipped = 0;
        let errors = 0;
        
        // For each parent, ensure they have all modules in parent_modules
        for (const parent of parents) {

            
            // Get existing parent_modules entries
            const { data: existingEntries } = await supabase
                .from('parent_modules')
                .select('module_id')
                .eq('parent_id', parent.id);
            
            const existingModuleIds = new Set(existingEntries?.map(e => e.module_id) || []);
            
            // Add missing modules
            for (const module of modules) {
                if (existingModuleIds.has(module.id)) {
                    skipped++;
                    continue;
                }
                

                
                const { error: insertError } = await supabase
                    .from('parent_modules')
                    .insert({
                        parent_id: parent.id,
                        module_id: module.id,
                        is_active: true // Make all modules active by default
                    });
                
                if (insertError) {
                    console.error(`[FixParentModules]   Error:`, insertError);
                    errors++;
                } else {
                    added++;
                }
            }
        }
        


        
        alert(
            `✓ Parent modules fix complete!\n\n` +
            `Added: ${added}\n` +
            `Skipped (already existed): ${skipped}\n` +
            `Errors: ${errors}\n\n` +
            `Please refresh the page.`
        );
        
    } catch (error) {
        console.error('[FixParentModules] Fatal error:', error);
        alert('Error fixing parent modules: ' + error.message);
    }
}

// Instructions
console.log(`
=== Fix Parent Modules Script ===

This script will add all existing modules to the parent_modules table
for all parents, ensuring they can activate modules for their children.

To run this script:
1. Make sure you're on the admin or dashboard page (where supabase is available)
2. Open the browser console (F12)
3. Copy and paste this entire script
4. Run: fixParentModules()

This is a one-time fix and safe to run multiple times (it skips existing entries).
`);

// Export for use
if (typeof window !== 'undefined') {
    window.fixParentModules = fixParentModules;
}
