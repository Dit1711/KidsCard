-- Notification service schema: per-family in-app notification feed

CREATE TABLE notification.notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id   UUID         NOT NULL,                 -- recipient scope (a parent sees their family's feed)
    category    VARCHAR(32)  NOT NULL,                 -- PAYMENT, ALLOWANCE, LIMIT, KYC, FAMILY, CARD
    title       VARCHAR(160) NOT NULL,
    message     VARCHAR(512) NOT NULL,
    icon        VARCHAR(16),                           -- emoji shown in the UI
    is_read     BOOLEAN      NOT NULL DEFAULT FALSE,
    metadata    JSONB,                                 -- optional structured context (amounts, ids)
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_family ON notification.notifications(family_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notification.notifications(family_id, is_read);
