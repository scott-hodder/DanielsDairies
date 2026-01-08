// Fix module-db.js import paths in all modules
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function fixModuleImports() {


    // Fetch all modules
    const { data: modules, error } = await supabase
        .from('modules')
        .select('id, code, html_content');

    if (error) {
        console.error('❌ Error fetching modules:', error);
        return;
    }



    let fixedCount = 0;

    for (const module of modules) {
        if (!module.html_content) {

            continue;
        }

        // Check if it has the wrong import path
        if (module.html_content.includes(`from './module-db.js'`)) {


            // Replace the import path
            const fixedHtml = module.html_content.replace(
                /from ['"]\.\/module-db\.js['"]/g,
                `from './modules/module-db.js'`
            );

            // Update in database
            const { error: updateError } = await supabase
                .from('modules')
                .update({ html_content: fixedHtml })
                .eq('id', module.id);

            if (updateError) {
                console.error(`   ❌ Error updating ${module.code}:`, updateError);
            } else {

                fixedCount++;
            }
        } else if (module.html_content.includes(`from './modules/module-db.js'`)) {

        } else {

        }
    }


}

fixModuleImports().catch(console.error);
