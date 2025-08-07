-- Initialize the database with any required setup
-- This file runs automatically when the PostgreSQL container starts

-- Ensure the database is created (docker-compose already handles this)
-- CREATE DATABASE qdocument_qa;

-- Add any additional initialization here if needed
-- For example, extensions, initial data, etc.

-- Enable required extensions if needed
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- This file is executed only on the first container startup
SELECT 'Database initialized successfully' as status;
