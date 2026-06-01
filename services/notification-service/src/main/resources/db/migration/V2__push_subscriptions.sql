-- Web Push subscriptions: one row per browser/device that opted in to push.
-- Scoped to a family so a notification reaches every device in that family.
CREATE TABLE notification.push_subscriptions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id   UUID         NOT NULL,
    endpoint    TEXT         NOT NULL UNIQUE,    -- push service URL (identifies the device)
    p256dh      VARCHAR(255) NOT NULL,           -- client public key
    auth        VARCHAR(255) NOT NULL,           -- client auth secret
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_push_subscriptions_family ON notification.push_subscriptions (family_id);
