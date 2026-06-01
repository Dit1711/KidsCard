-- Child login credentials. A child is not a phone/OTP user; the parent issues
-- a short login code + PIN that the child uses to access their own cabinet.

CREATE TABLE auth.child_credentials (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id      UUID         NOT NULL UNIQUE,          -- family.children.id
    family_id     UUID         NOT NULL,
    login_code    VARCHAR(16)  NOT NULL UNIQUE,          -- human-friendly handle
    pin_hash      VARCHAR(255) NOT NULL,                 -- BCrypt
    display_name  VARCHAR(255),
    active        BOOLEAN      NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_child_credentials_login_code ON auth.child_credentials(login_code);
