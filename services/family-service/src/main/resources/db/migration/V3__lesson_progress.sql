-- Financial-literacy gamification: track which lessons a child has completed,
-- the quiz outcome and stars (XP) earned. Lesson CONTENT lives in the web app
-- (editorial); the backend only records progress and totals.
CREATE TABLE family.lesson_progress (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id      UUID         NOT NULL REFERENCES family.children(id),
    lesson_id     VARCHAR(64)  NOT NULL,                 -- editorial lesson key, e.g. 'what-is-money'
    quiz_correct  BOOLEAN      NOT NULL DEFAULT FALSE,
    stars_earned  INT          NOT NULL DEFAULT 0,
    completed_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_lesson_progress_child_lesson UNIQUE (child_id, lesson_id)
);

CREATE INDEX idx_lesson_progress_child ON family.lesson_progress (child_id);
