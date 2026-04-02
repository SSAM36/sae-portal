-- Run this in your Supabase SQL Editor

-- Create enum for application status
CREATE TYPE application_status AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED');

-- 1. Teams Table
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE
);

-- Insert the 11 Teams (Example names, you can change them)
INSERT INTO teams (name) VALUES 
('Formula SAE'), ('Baja SAE'), ('Aero Design'), ('Supermileage'), 
('Solar Car'), ('Autonomous Racing'), ('RoboSub'), ('Clean Snowmobile'), 
('Human Powered Vehicle'), ('Formula Electric'), ('Design Team');

-- 2. Candidates Table
CREATE TABLE candidates (
    sap_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    has_arrived BOOLEAN DEFAULT FALSE,
    current_team_id UUID REFERENCES teams(id) DEFAULT NULL, -- Locks candidate to a team
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Candidate Applications Table (Maps candidates to teams they applied to)
CREATE TABLE candidate_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_sap_id VARCHAR(50) REFERENCES candidates(sap_id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    status application_status DEFAULT 'NOT_STARTED',
    UNIQUE(candidate_sap_id, team_id) -- Prevent duplicate applications to the same team
);

-- Turn on Realtime for these tables to listen to changes on the frontend
alter publication supabase_realtime add table candidates;
alter publication supabase_realtime add table candidate_applications;
