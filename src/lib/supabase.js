import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ngpsplbcdzjrmrrkkeqg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncHNwbGJjZHpqcm1ycmtrZXFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NDk5MDYsImV4cCI6MjA4MTEyNTkwNn0.mtPTH_cu9QqmpMLEK3u5hElNsmDqIxVWuBDd-J6sOrM';


export const supabase = createClient(supabaseUrl, supabaseAnonKey)