-- Add repo_url column to projects table so the GitHub link persists across sessions
ALTER TABLE projects ADD repo_url NVARCHAR(2000) NOT NULL DEFAULT '';
