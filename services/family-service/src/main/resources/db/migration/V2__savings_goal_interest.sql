-- Track total interest credited to a savings goal so the kid sees how much
-- their savings have earned on their own.
ALTER TABLE family.savings_goals
    ADD COLUMN interest_earned BIGINT NOT NULL DEFAULT 0;
