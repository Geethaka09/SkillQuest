ALTER TABLE student
ADD COLUMN is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN verification_token VARCHAR(255),
ADD COLUMN verification_token_expires DATETIME;
