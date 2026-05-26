-- Card service schema: KIDS_CARD and virtual/physical card details

CREATE TABLE card.kids_cards (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id        UUID         NOT NULL,               -- FK to family.children
    family_id       UUID         NOT NULL,
    card_type       VARCHAR(16)  NOT NULL,               -- VIRTUAL, PHYSICAL
    card_token      VARCHAR(255) NOT NULL UNIQUE,        -- tokenized PAN (PCI DSS — no PAN stored)
    masked_pan      VARCHAR(19)  NOT NULL,               -- e.g. "4149 **** **** 1234"
    expiry_month    SMALLINT     NOT NULL,
    expiry_year     SMALLINT     NOT NULL,
    network         VARCHAR(32)  NOT NULL DEFAULT 'UZCARD', -- UZCARD, HUMO, VISA
    status          VARCHAR(32)  NOT NULL DEFAULT 'PENDING', -- PENDING, ACTIVE, FROZEN, BLOCKED, EXPIRED
    frozen_by       UUID,                                -- parent_id who froze
    frozen_at       TIMESTAMPTZ,
    issued_at       TIMESTAMPTZ,
    balance_uzs     BIGINT       NOT NULL DEFAULT 0,     -- cached balance in tiyin
    balance_cached_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version         BIGINT       NOT NULL DEFAULT 0
);

-- Card top-up schedule (allowance)
CREATE TABLE card.allowance_schedules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id         UUID         NOT NULL REFERENCES card.kids_cards(id),
    amount_uzs      BIGINT       NOT NULL,
    frequency       VARCHAR(32)  NOT NULL,               -- WEEKLY, MONTHLY
    day_of_week     SMALLINT,                            -- 1=MON for WEEKLY
    day_of_month    SMALLINT,                            -- 1-28 for MONTHLY
    active          BOOLEAN      NOT NULL DEFAULT TRUE,
    next_run_at     TIMESTAMPTZ,
    last_run_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE card.outbox_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type  VARCHAR(64)  NOT NULL,
    aggregate_id    VARCHAR(64)  NOT NULL,
    event_type      VARCHAR(128) NOT NULL,
    topic           VARCHAR(128) NOT NULL,
    payload         JSONB        NOT NULL,
    status          VARCHAR(32)  NOT NULL DEFAULT 'PENDING',
    retry_count     INT          NOT NULL DEFAULT 0,
    last_error      TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    processed_at    TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_kids_cards_child_id ON card.kids_cards(child_id);
CREATE INDEX idx_kids_cards_family_id ON card.kids_cards(family_id);
CREATE INDEX idx_kids_cards_status ON card.kids_cards(status);
CREATE INDEX idx_allowance_schedules_card_id ON card.allowance_schedules(card_id);
CREATE INDEX idx_allowance_next_run ON card.allowance_schedules(next_run_at) WHERE active = TRUE;
CREATE INDEX idx_outbox_status ON card.outbox_events(status, created_at);
