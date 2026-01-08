// Script to fix and re-upload daniels_diaries_module2.html to Supabase Storage
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

// Fix escaped backticks
function fixEscapedBackticks(htmlContent) {

  const fixedContent = htmlContent.replace(
    /\\`([^`]*?)\\?\$\{([^}]+?)\}\\`/g,
    '`$1\${$2}`'
  );
  const changesMade = fixedContent !== htmlContent;
  if (changesMade) {

  }
  return fixedContent;
}

// Add Home button
function addHomeButton(htmlContent) {

  
  if (htmlContent.includes('goHome()') || htmlContent.includes('🏠 Home')) {

    return htmlContent;
  }
  
  const printButtonPattern = /(onclick="prepareForPrint\(\)"[^>]*>🖨️ Print<\/button>)/;
  
  if (printButtonPattern.test(htmlContent)) {
    let updatedContent = htmlContent.replace(
      printButtonPattern,
      '$1\n                \n                <button onclick="goHome()" class="text-white px-4 py-2 rounded-xl font-bold hover:shadow-lg transition-all font-title" style="background-color: #5e2a84;">🏠 Home</button>'
    );
    
    if (!updatedContent.includes('function goHome()')) {
      const goHomeFunction = '\n        // Navigate back to dashboard\n' +
        '        function goHome() {\n' +
        '            window.location.href = \'/dashboard.html\';\n' +
        '        }\n';
      
      updatedContent = updatedContent.replace(
        /<\/script>/,
        goHomeFunction + '    <' + '/script>'
      );
    }
    

    return updatedContent;
  }
  

  return htmlContent;
}

async function fixAndUploadModule2() {
  try {


    // Read the local fixed file
    const filepath = path.join(__dirname, 'modules', 'daniels_diaries_module2.html');

    let htmlContent = await fs.readFile(filepath, 'utf8');


    // Apply fixes
    htmlContent = fixEscapedBackticks(htmlContent);
    htmlContent = addHomeButton(htmlContent);
    


    // Find the module to get its code
    const { data: modules, error: fetchError } = await supabase
      .from('modules')
      .select('code, storage_path')
      .ilike('title', '%Feelings%Messengers%')
      .single();

    if (fetchError || !modules) {
      console.error('❌ Could not find module in database');

      
      const { data: allModules } = await supabase
        .from('modules')
        .select('code, title, storage_path')
        .ilike('title', '%Daniel%');
      
      if (allModules && allModules.length > 0) {

        allModules.forEach(m => console.log(`  - ${m.code}: ${m.title}`));

      }
      process.exit(1);
    }

    const storagePath = modules.storage_path || `modules/${modules.code}/index.html`;


    // Create blob
    const blob = new Blob([htmlContent], { type: 'text/html' });

    // Upload to Storage (overwrite existing)
    const { error: uploadError } = await supabase.storage
      .from('modules')
      .upload(storagePath, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'text/html'
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      process.exit(1);
    }






  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixAndUploadModule2();
