-- Two-way family communication: a child asks a parent for a card top-up or a
-- limit increase; the parent approves (effect applied server-side) or declines.
CREATE TABLE family.money_requests (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id    UUID         NOT NULL REFERENCES family.families(id),
    child_id     UUID         NOT NULL REFERENCES family.children(id),
    type         VARCHAR(16)  NOT NULL,                 -- TOPUP, LIMIT
    amount_uzs   BIGINT       NOT NULL,
    card_id      UUID,                                  -- target card (TOPUP)
    limit_type   VARCHAR(16),                           -- DAILY/WEEKLY/MONTHLY/CATEGORY (LIMIT)
    category     VARCHAR(64),                           -- MCC (CATEGORY limit)
    note         VARCHAR(255),                          -- child's "why"
    status       VARCHAR(16)  NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, DECLINED
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    resolved_at  TIMESTAMPTZ,
    resolved_by  UUID
);

CREATE INDEX idx_money_requests_family_status ON family.money_requests (family_id, status);
CREATE INDEX idx_money_requests_child ON family.money_requests (child_id);
