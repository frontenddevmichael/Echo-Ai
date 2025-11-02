// supabaseClient.js
const SUPABASE_URL = "https://oxhocyyvtclvktgklrnj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94aG9jeXl2dGNsdmt0Z2tscm5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMDEwOTAsImV4cCI6MjA3NzU3NzA5MH0.oxEvY68JElEpDq2LQ9EXxVUbMMDAFTwp9J52PKlJkns"; // Anon key is fine for browser

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export default supabase;
