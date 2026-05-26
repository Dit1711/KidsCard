-- Open Banking service schema: BANK_CONSENT, LINKED_ACCOUNT, AIS/PIS requests

CREATE TABLE open_banking.bank_consents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id       UUID         NOT NULL,               -- FK to family.parents
    bank_code       VARCHAR(32)  NOT NULL,               -- UZCARD, HUMO, NBU, etc.
    consent_type    VARCHAR(32)  NOT NULL,               -- AIS, PIS, AIS_PIS
    external_id     VARCHAR(255) NOT NULL UNIQUE,        -- bank-side consent ID
    status          VARCHAR(32)  NOT NULL DEFAULT 'PENDING', -- PENDING, ACTIVE, EXPIRED, REVOKED
    scopes          TEXT[]       NOT NULL DEFAULT '{}',
    access_token    TEXT,                                -- encrypted
    refresh_token   TEXT,                                -- encrypted
    token_expires_at TIMESTAMPTZ,
    granted_at      TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    revoked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE open_banking.linked_accounts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consent_id      UUID         NOT NULL REFERENCES open_banking.bank_consents(id),
    parent_id       UUID         NOT NULL,
    bank_code       VARCHAR(32)  NOT NULL,
    external_account_id VARCHAR(255) NOT NULL,
    account_type    VARCHAR(32)  NOT NULL,               -- CURRENT, SAVINGS, CARD
    masked_number   VARCHAR(50),
    holder_name     VARCHAR(255),
    currency        VARCHAR(3)   NOT NULL DEFAULT 'UZS',
    status          VARCHAR(32)  NOT NULL DEFAULT 'ACTIVE',
    balance_uzs     BIGINT,                              -- cached, may be stale
    balance_cached_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (consent_id, external_account_id)
);

-- PIS: payment initiation requests to partner banks
CREATE TABLE open_banking.payment_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key VARCHAR(255) NOT NULL UNIQUE,
    consent_id      UUID         NOT NULL REFERENCES open_banking.bank_consents(id),
    from_account_id UUID         NOT NULL REFERENCES open_banking.linked_accounts(id),
    amount_uzs      BIGINT       NOT NULL,
    currency        VARCHAR(3)   NOT NULL DEFAULT 'UZS',
    description     TEXT,
    status          VARCHAR(32)  NOT NULL DEFAULT 'PENDING', -- PENDING, SUBMITTED, COMPLETED, FAILED
    external_ref    VARCHAR(255),
    submitted_at    TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    failed_reason   TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE open_banking.outbox_events (
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
CREATE INDEX idx_consents_parent_id ON open_banking.bank_consents(parent_id);
CREATE INDEX idx_consents_bank_code ON open_banking.bank_consents(bank_code, status);
CREATE INDEX idx_linked_accounts_parent_id ON open_banking.linked_accounts(parent_id);
CREATE INDEX idx_linked_accounts_consent_id ON open_banking.linked_accounts(consent_id);
CREATE INDEX idx_payment_requests_consent_id ON open_banking.payment_requests(consent_id);
CREATE INDEX idx_outbox_status ON open_banking.outbox_events(status, created_at);
