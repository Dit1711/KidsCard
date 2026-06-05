-- EPIC-2: photo proof for chores.
-- A chore can require a photo on completion; the child's uploaded photo is
-- referenced by a storage key and auto-deleted ~30 days after approval.
ALTER TABLE family.chores
    ADD COLUMN requires_photo boolean NOT NULL DEFAULT false,
    ADD COLUMN proof_photo_key varchar(255),
    ADD COLUMN proof_photo_at  timestamptz;
