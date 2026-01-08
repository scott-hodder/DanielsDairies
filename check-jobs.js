// Check AI generation jobs in the database
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkJobs() {

  
  try {
    // Get all jobs, most recent first
    const { data: jobs, error } = await supabase
      .from('ai_generation_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('Error fetching jobs:', error);
      return;
    }
    

    jobs.forEach(job => {




      if (job.error) {

      }
      if (job.result) {

      }
    });
    
  } catch (error) {
    console.error('Check failed:', error);
  }
}

checkJobs();
