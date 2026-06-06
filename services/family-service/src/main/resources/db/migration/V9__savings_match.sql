-- SAV-04: parent savings match (per child) + audit of paid-out bonuses.
CREATE TABLE family.savings_match_rules (
    child_id        uuid PRIMARY KEY,
    percent         integer     NOT NULL DEFAULT 0,
    monthly_cap_uzs bigint,                       -- null => no monthly cap
    updated_at      timestamptz NOT NULL
);

CREATE TABLE family.match_awards (
    id         uuid PRIMARY KEY,
    child_id   uuid        NOT NULL,
    goal_id    uuid        NOT NULL,
    amount_uzs bigint      NOT NULL,
    created_at timestamptz NOT NULL
);
-- Sum-this-month per child drives the monthly cap.
CREATE INDEX idx_match_awards_child_date ON family.match_awards (child_id, created_at);
