ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "createdAt" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp NOT NULL;