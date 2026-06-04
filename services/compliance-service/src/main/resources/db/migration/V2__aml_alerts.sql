-- AML monitoring: a lightweight projection of money movements (for windowed
-- rules like velocity / structuring) plus the alert queue the compliance team
-- works. Implements ТЗ FR-KYC-03 / UC-17 (AML-мониторинг, правила и алерты).

CREATE TABLE compliance.aml_event (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id   UUID,
    child_id    UUID,
    card_id     UUID,
    amount_uzs  BIGINT       NOT NULL,
    direction   VARCHAR(16)  NOT NULL,        -- CREDIT / DEBIT
    type        VARCHAR(32),
    occurred_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_aml_event_child  ON compliance.aml_event(child_id, occurred_at DESC);
CREATE INDEX idx_aml_event_family ON compliance.aml_event(family_id, occurred_at DESC);

CREATE TABLE compliance.aml_alert (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id       UUID,
    child_id        UUID,
    rule_code       VARCHAR(48)  NOT NULL,    -- LARGE_TRANSACTION, VELOCITY, ...
    severity        VARCHAR(16)  NOT NULL,    -- LOW / MEDIUM / HIGH
    title           VARCHAR(160) NOT NULL,
    detail          VARCHAR(512) NOT NULL,
    amount_uzs      BIGINT,
    status          VARCHAR(16)  NOT NULL DEFAULT 'OPEN',   -- OPEN/REVIEWING/CLEARED/ESCALATED
    resolved_by     UUID,
    resolution_note VARCHAR(512),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_aml_alert_status ON compliance.aml_alert(status, created_at DESC);
CREATE INDEX idx_aml_alert_child  ON compliance.aml_alert(child_id, created_at DESC);
