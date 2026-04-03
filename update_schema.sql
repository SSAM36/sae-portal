-- Add this to your database_schema.sql and run it in Supabase

-- Ensure core extension exists for UUID defaults
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Applicants Table (canonical schema used by current frontend)
CREATE TABLE IF NOT EXISTS applicants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    sap_id VARCHAR(50) NOT NULL,
    phone_number VARCHAR(30),
    department VARCHAR(120) DEFAULT 'Other',
    teams TEXT[] DEFAULT '{}',
    arrived BOOLEAN DEFAULT FALSE,
    current_status TEXT DEFAULT 'Not Arrived',
    current_team TEXT,
    interview_status JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns for older deployments
ALTER TABLE IF EXISTS applicants ADD COLUMN IF NOT EXISTS phone_number VARCHAR(30);
ALTER TABLE IF EXISTS applicants ADD COLUMN IF NOT EXISTS department VARCHAR(120) DEFAULT 'Other';
ALTER TABLE IF EXISTS applicants ADD COLUMN IF NOT EXISTS teams TEXT[] DEFAULT '{}';
ALTER TABLE IF EXISTS applicants ADD COLUMN IF NOT EXISTS arrived BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS applicants ADD COLUMN IF NOT EXISTS current_status TEXT DEFAULT 'Not Arrived';
ALTER TABLE IF EXISTS applicants ADD COLUMN IF NOT EXISTS current_team TEXT;
ALTER TABLE IF EXISTS applicants ADD COLUMN IF NOT EXISTS interview_status JSONB DEFAULT '{}'::jsonb;
ALTER TABLE IF EXISTS applicants ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Backfill department from legacy column names if they exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'applicants' AND column_name = 'branch'
    ) THEN
        EXECUTE 'UPDATE applicants SET department = COALESCE(NULLIF(department, ''''), branch, ''Other'') WHERE department IS NULL OR department = ''''';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'applicants' AND column_name = 'dept'
    ) THEN
        EXECUTE 'UPDATE applicants SET department = COALESCE(NULLIF(department, ''''), dept, ''Other'') WHERE department IS NULL OR department = ''''';
    END IF;
END $$;

-- Remove unique SAP ID constraint so roster imports can load duplicate SAP IDs if needed
ALTER TABLE IF EXISTS applicants
DROP CONSTRAINT IF EXISTS applicants_sap_id_key;

-- Helpful indexes for queue filtering and realtime-heavy usage
CREATE INDEX IF NOT EXISTS idx_applicants_arrived ON applicants(arrived);
CREATE INDEX IF NOT EXISTS idx_applicants_current_team ON applicants(current_team);
CREATE INDEX IF NOT EXISTS idx_applicants_created_at ON applicants(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applicants_teams_gin ON applicants USING GIN (teams);

-- 4. Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable real-time for logs/applicants safely (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'activity_logs'
    ) THEN
        EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'applicants'
    ) THEN
        EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE applicants';
    END IF;
END $$;
