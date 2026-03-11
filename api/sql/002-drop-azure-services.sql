-- Migration 002: Drop azure_services column
-- The azureServices field is being removed — tags handle filtering instead.

ALTER TABLE projects DROP COLUMN IF EXISTS azure_services;
