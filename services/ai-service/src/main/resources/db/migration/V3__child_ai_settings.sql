-- EPIC-4 phase 2: parent-managed AI controls per child.
-- Absent row => defaults (enabled, global daily limit).
CREATE TABLE ai.child_ai_settings (
    child_id    uuid PRIMARY KEY,
    enabled     boolean     NOT NULL DEFAULT true,
    daily_limit integer,                 -- null => fall back to the global default
    updated_at  timestamptz NOT NULL
);
