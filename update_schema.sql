-- Add this to your database_schema.sql and run it in Supabase

-- Remove unique SAP ID constraint so roster imports can load duplicate SAP IDs if needed
ALTER TABLE IF EXISTS applicants
DROP CONSTRAINT IF EXISTS applicants_sap_id_key;

-- 4. Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable real-time for logs (optional but nice)
alter publication supabase_realtime add table activity_logs;
