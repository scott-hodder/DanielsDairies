// Script to sync module HTML from database to /modules/ folder
// Run this after uploading modules via admin panel to create the physical files

import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

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

async function syncModules() {
  try {


    // Get all modules from database that have html_content
    const { data: modules, error: fetchError } = await supabase
      .from('modules')
      .select('*')
      .not('html_content', 'is', null)
      .order('code');

    if (fetchError) {
      throw new Error(`Failed to fetch modules: ${fetchError.message}`);
    }



    let successCount = 0;
    let errorCount = 0;

    // Ensure /modules directory exists
    const modulesDir = path.join(__dirname, 'modules');
    try {
      await fs.access(modulesDir);
    } catch {
      await fs.mkdir(modulesDir, { recursive: true });

    }

    for (const module of modules) {
      try {
        // Extract module number from code (e.g., MODULE1 -> 1)
        const moduleNumber = module.code.replace('MODULE', '');
        const filename = `module${moduleNumber}.html`;
        const filepath = path.join(modulesDir, filename);

        // Write file
        await fs.writeFile(filepath, module.html_content, 'utf8');


        successCount++;

      } catch (error) {
        console.error(`❌ ${module.code}: ${error.message}`);
        errorCount++;
      }
    }






    if (successCount > 0) {


    }

  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    process.exit(1);
  }
}

syncModules();
