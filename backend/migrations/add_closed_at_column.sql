-- Migration: Add closed_at column to student table for tracking session exit times
-- The last_login column already exists, so we only add closed_at

ALTER TABLE student
ADD COLUMN closed_at DATETIME DEFAULT NULL;
