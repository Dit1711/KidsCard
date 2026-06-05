-- EPIC-4 phase 4: AI-tutor study sessions feed gamification XP + streak.
-- One row per (child, day); the unique constraint caps farming.
CREATE TABLE family.study_sessions (
    id         uuid PRIMARY KEY,
    child_id   uuid        NOT NULL,
    study_date date        NOT NULL,
    created_at timestamptz NOT NULL,
    CONSTRAINT uq_study_sessions_child_day UNIQUE (child_id, study_date)
);
CREATE INDEX idx_study_sessions_child ON family.study_sessions (child_id);
