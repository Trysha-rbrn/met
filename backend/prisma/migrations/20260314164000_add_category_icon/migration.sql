-- Add icon field to categories so users can pick and store category icon
ALTER TABLE "Category"
ADD COLUMN "icon" TEXT NOT NULL DEFAULT 'Tag';
