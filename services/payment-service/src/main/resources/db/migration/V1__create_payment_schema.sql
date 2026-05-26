-- Payment service schema: TRANSACTION with double-entry ledger pattern

CREATE TABLE payment.transactions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key     VARCHAR(255) NOT NULL UNIQUE,   -- client-provided idempotency
    card_id             UUID         NOT NULL,           -- FK to card.kids_cards
    child_id            UUID         NOT NULL,
    family_id           UUID         NOT NULL,
    type                VARCHAR(32)  NOT NULL,           -- PURCHASE, TOPUP, REFUND, TRANSFER, ALLOWANCE
    status              VARCHAR(32)  NOT NULL DEFAULT 'PENDING', -- PENDING, AUTHORIZED, CAPTURED, FAILED, REVERSED
    amount_uzs          BIGINT       NOT NULL,           -- in tiyin (always positive)
    currency            VARCHAR(3)   NOT NULL DEFAULT 'UZS',
    direction           VARCHAR(8)   NOT NULL,           -- DEBIT, CREDIT
    merchant_name       VARCHAR(255),
    merchant_mcc        VARCHAR(8),
    merchant_country    VARCHAR(3),
    description         TEXT,
    external_ref        VARCHAR(255),                   -- bank/network reference
    open_banking_ref    UUID,                           -- FK to open_banking.payment_requests
    dispute_id          UUID,
    authorized_at       TIMESTAMPTZ,
    captured_at         TIMESTAMPTZ,
    failed_at           TIMESTAMPTZ,
    failed_reason       TEXT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version             BIGINT       NOT NULL DEFAULT 0
);

-- Double-entry ledger entries
CREATE TABLE payment.ledger_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  UUID         NOT NULL REFERENCES payment.transactions(id),
    account_id      VARCHAR(128) NOT NULL,              -- card_id or internal account ref
    account_type    VARCHAR(32)  NOT NULL,              -- CARD, FLOAT, REVENUE
    direction       VARCHAR(8)   NOT NULL,              -- DEBIT, CREDIT
    amount_uzs      BIGINT       NOT NULL,
    running_balance BIGINT       NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE payment.disputes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  UUID         NOT NULL REFERENCES payment.transactions(id),
    raised_by       UUID         NOT NULL,              -- parent_id
    reason          VARCHAR(64)  NOT NULL,
    description     TEXT,
    status          VARCHAR(32)  NOT NULL DEFAULT 'OPEN', -- OPEN, UNDER_REVIEW, RESOLVED, REJECTED
    resolution      TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE payment.outbox_events (
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
CREATE INDEX idx_transactions_card_id ON payment.transactions(card_id);
CREATE INDEX idx_transactions_child_id ON payment.transactions(child_id);
CREATE INDEX idx_transactions_family_id ON payment.transactions(family_id);
CREATE INDEX idx_transactions_status ON payment.transactions(status);
CREATE INDEX idx_transactions_created_at ON payment.transactions(created_at DESC);
CREATE INDEX idx_ledger_transaction_id ON payment.ledger_entries(transaction_id);
CREATE INDEX idx_ledger_account ON payment.ledger_entries(account_id, created_at DESC);
CREATE INDEX idx_outbox_status ON payment.outbox_events(status, created_at);
