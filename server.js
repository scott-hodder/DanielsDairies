// Simple Express server for handling module file uploads and AI generation
import express from 'express';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { migrateModule } from './migrate-module-script.js';

// Load environment variables
dotenv.config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

// Enable CORS
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase limit for large prompts

// Initialize Supabase
const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

// Configure multer for file uploads - use memory storage first
const upload = multer({ 
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/html' || file.originalname.endsWith('.html')) {
      cb(null, true);
    } else {
      cb(new Error('Only HTML files are allowed'));
    }
  }
});

// Migration endpoint
app.post('/api/migrate-module', upload.single('htmlFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const moduleCode = (req.body.moduleCode || '').trim();
    if (!moduleCode) {
      return res.status(400).json({ error: 'Module code is required' });
    }

    const tempDir = path.join(__dirname, 'tmp');
    await fs.mkdir(tempDir, { recursive: true });

    const safeName = req.file.originalname.replace(/[^a-z0-9_.-]/gi, '_');
    const timestamp = Date.now();
    const inputPath = path.join(tempDir, `upload-${timestamp}-${safeName}`);
    const outputPath = path.join(tempDir, `migrated-${timestamp}-${safeName}`);

    await fs.writeFile(inputPath, req.file.buffer);

    try {
      migrateModule(inputPath, outputPath, moduleCode);
      const migratedHtml = await fs.readFile(outputPath, 'utf8');

      return res.json({
        success: true,
        html: migratedHtml,
        moduleCode,
      });
    } catch (error) {
      console.error('Migration error:', error);
      return res.status(500).json({ error: error.message || 'Migration failed' });
    } finally {
      // Clean up temp files
      await Promise.allSettled([
        fs.unlink(inputPath).catch(() => {}),
        fs.unlink(outputPath).catch(() => {}),
      ]);
    }
  } catch (error) {
    console.error('Migration endpoint error:', error);
    return res.status(500).json({ error: error.message || 'Migration failed' });
  }
});

// Upload endpoint
app.post('/api/upload-module', upload.single('htmlFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const moduleCode = req.body.moduleCode;
    if (!moduleCode || !moduleCode.startsWith('MODULE')) {
      return res.status(400).json({ error: 'Invalid module code' });
    }

    // Generate filename from module code
    const moduleNumber = moduleCode.replace('MODULE', '');
    const filename = `module${moduleNumber}.html`;
    const filepath = path.join(__dirname, 'modules', filename);

    // Save file to disk
    await fs.writeFile(filepath, req.file.buffer);



    // Update dashboard.js to add the new module mapping
    await updateDashboardMapping(moduleCode, filename);

    res.json({ 
      success: true, 
      filename: filename,
      moduleCode: moduleCode,
      message: 'Module uploaded and mapping updated successfully'
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Function to update dashboard.js with new module mapping
async function updateDashboardMapping(moduleCode, filename) {
  const dashboardPath = path.join(__dirname, 'src', 'dashboard.js');
  
  try {
    let content = await fs.readFile(dashboardPath, 'utf8');
    
    // Find the moduleFiles object
    const moduleFilesRegex = /const moduleFiles = \{([^}]+)\}/s;
    const match = content.match(moduleFilesRegex);
    
    if (match) {
      const currentMappings = match[1];
      
      // Check if module code already exists
      if (currentMappings.includes(`'${moduleCode}'`)) {

        return;
      }
      
      // Add new mapping (remove trailing } and add new entry)
      const moduleNumber = moduleCode.replace('MODULE', '');
      const correctFilename = `module${moduleNumber}.html`;
      const newMapping = `'${moduleCode}': '${correctFilename}'`;
      const updatedMappings = currentMappings.trimEnd() + `,\n      ${newMapping}`;
      const updatedModuleFiles = `const moduleFiles = {${updatedMappings}}`;
      
      content = content.replace(moduleFilesRegex, updatedModuleFiles);
      
      await fs.writeFile(dashboardPath, content, 'utf8');

    }
  } catch (error) {
    console.error('Error updating dashboard.js:', error);
    throw error;
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Module upload server is running' });
});

// Delete module file endpoint
app.delete('/api/delete-module/:moduleCode', async (req, res) => {
  try {
    const { moduleCode } = req.params;
    
    if (!moduleCode || !moduleCode.startsWith('MODULE')) {
      return res.status(400).json({ error: 'Invalid module code' });
    }
    
    // Generate filename from module code
    const moduleNumber = moduleCode.replace('MODULE', '');
    const filename = `module${moduleNumber}.html`;
    const filepath = path.join(__dirname, 'modules', filename);
    
    // Check if file exists
    try {
      await fs.access(filepath);
    } catch {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Delete the file
    await fs.unlink(filepath);

    
    // Remove from dashboard.js mapping
    await removeDashboardMapping(moduleCode);
    
    res.json({ 
      success: true, 
      filename: filename,
      message: 'Module file deleted successfully'
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove module mapping from dashboard.js
async function removeDashboardMapping(moduleCode) {
  try {
    const dashboardPath = path.join(__dirname, 'src', 'dashboard.js');
    let content = await fs.readFile(dashboardPath, 'utf8');
    
    // Find and update the moduleFiles object
    const moduleFilesRegex = /const moduleFiles = \{([^}]+)\}/s;
    const match = content.match(moduleFilesRegex);
    
    if (match) {
      let currentMappings = match[1];
      
      // Remove the line containing this module code
      const lines = currentMappings.split('\n');
      const filteredLines = lines.filter(line => !line.includes(`'${moduleCode}'`));
      
      // Rebuild the mappings properly
      let updatedMappings = filteredLines
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n      ');
      
      // Remove any trailing commas before closing brace
      updatedMappings = updatedMappings.replace(/,+\s*$/, '');
      
      const updatedModuleFiles = `const moduleFiles = {\n      ${updatedMappings}\n    }`;
      content = content.replace(moduleFilesRegex, updatedModuleFiles);
      
      await fs.writeFile(dashboardPath, content, 'utf8');

    }
  } catch (error) {
    console.error('Error removing from dashboard.js:', error);
  }
}

// AI Module Generation endpoint
app.post('/api/generate-module', async (req, res) => {
  try {
    const { contentBrief } = req.body;

    if (!contentBrief) {
      return res.status(400).json({ error: 'Content brief is required' });
    }



    // 1. Fetch rulesheet and example from database
    const { data: configs, error: configError } = await supabase
      .from('ai_module_config')
      .select('config_type, content')
      .eq('is_active', true)
      .in('config_type', ['rulesheet', 'example_module']);

    if (configError) {
      console.error('[AI] Config fetch error:', configError);
      return res.status(500).json({ error: 'Failed to fetch AI configuration' });
    }

    const rulesheet = configs.find(c => c.config_type === 'rulesheet')?.content;
    const exampleModule = configs.find(c => c.config_type === 'example_module')?.content;

    if (!rulesheet) {
      return res.status(500).json({ error: 'AI rulesheet not found in database' });
    }

    // 2. Get Claude API key from settings
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('claude_api_key')
      .single();

    if (settingsError || !settings?.claude_api_key) {
      return res.status(500).json({ error: 'Claude API key not configured in settings' });
    }

    // 3. Construct prompt
    const prompt = `You are a module generation AI. You will receive:
1. A rulesheet that defines EXACT structure and rules
2. An example module for reference (if available)
3. A content brief describing what to create

Your task: Generate a complete, valid HTML module following the rulesheet EXACTLY.

=== RULESHEET ===
${rulesheet}

${exampleModule ? `=== EXAMPLE MODULE (for reference) ===
${exampleModule}

` : ''}=== CONTENT BRIEF ===
${contentBrief}

=== INSTRUCTIONS ===
Generate a complete HTML module based on the content brief above.
Follow the rulesheet EXACTLY - no deviations.
Output ONLY the HTML - no explanations, no markdown code blocks.
Start with <!DOCTYPE html> and end with </html>.`;

    // 4. Call Claude API

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.claude_api_key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 16000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[AI] Claude API error:', errorData);
      return res.status(response.status).json({ 
        error: `Claude API error: ${errorData.error?.message || response.statusText}` 
      });
    }

    const data = await response.json();
    const html = data.content[0].text;

    // 5. Extract page count
    const pageCount = (html.match(/data-page/g) || []).length;



    res.json({
      html,
      pageCount,
      characterCount: html.length
    });

  } catch (error) {
    console.error('[AI] Generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {



});
