-- Parent wallet escrow. The wallet itself is a ledger account (account_type
-- WALLET, account_id = family_id). Holds reserve funds so a chore reward is
-- guaranteed at approval time: available = wallet balance − sum(HELD).

CREATE TABLE payment.holds (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id         UUID         NOT NULL,              -- wallet owner
    reference         VARCHAR(128) NOT NULL UNIQUE,       -- e.g. chore:<choreId>
    amount_uzs        BIGINT       NOT NULL,
    status            VARCHAR(32)  NOT NULL DEFAULT 'HELD', -- HELD, CAPTURED, RELEASED
    captured_to_card  UUID,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_holds_family_status ON payment.holds(family_id, status);
