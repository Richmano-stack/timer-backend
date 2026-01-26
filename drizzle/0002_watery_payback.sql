ALTER TABLE "user" ADD COLUMN "role" text DEFAULT 'agent' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;