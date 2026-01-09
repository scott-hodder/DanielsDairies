// Migration script to backfill HTML content for existing modules
// This reads HTML files from the /modules folder and stores them in the database

import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateModules() {
  try {


    // Get all modules from database
    const { data: modules, error: fetchError } = await supabase
      .from('modules')
      .select('*')
      .order('code');

    if (fetchError) {
      throw new Error(`Failed to fetch modules: ${fetchError.message}`);
    }



    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const module of modules) {
      try {
        // Check if module already has HTML content
        if (module.html_content && module.html_content.length > 0) {

          skipCount++;
          continue;
        }

        // Extract module number from code (e.g., MODULE1 -> 1)
        const moduleNumber = module.code.replace('MODULE', '');
        const filename = `module${moduleNumber}.html`;
        const filepath = path.join(__dirname, 'modules', filename);

        // Check if file exists
        try {
          await fs.access(filepath);
        } catch {

          skipCount++;
          continue;
        }

        // Read file content
        const htmlContent = await fs.readFile(filepath, 'utf8');

        // Update module in database
        const { error: updateError } = await supabase
          .from('modules')
          .update({ html_content: htmlContent })
          .eq('id', module.id);

        if (updateError) {
          throw new Error(`Failed to update: ${updateError.message}`);
        }


        successCount++;

      } catch (error) {
        console.error(`❌ ${module.code}: ${error.message}`);
        errorCount++;
      }
    }







    if (successCount > 0) {



    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrateModules();
