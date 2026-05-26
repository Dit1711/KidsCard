-- Auth service schema: users, roles, sessions, refresh tokens

CREATE TABLE auth.users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone           VARCHAR(20)  NOT NULL UNIQUE,
    phone_verified  BOOLEAN      NOT NULL DEFAULT FALSE,
    email           VARCHAR(255),
    email_verified  BOOLEAN      NOT NULL DEFAULT FALSE,
    password_hash   VARCHAR(255),
    status          VARCHAR(32)  NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, BLOCKED, DELETED
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version         BIGINT       NOT NULL DEFAULT 0
);

CREATE TABLE auth.user_roles (
    user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role            VARCHAR(64) NOT NULL,  -- PARENT_OWNER, CO_PARENT, ADMIN, SUPPORT, COMPLIANCE, PARTNER_BANK
    granted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    granted_by      UUID,
    PRIMARY KEY (user_id, role)
);

CREATE TABLE auth.refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) NOT NULL UNIQUE,
    device_id       VARCHAR(255),
    device_info     JSONB,
    expires_at      TIMESTAMPTZ  NOT NULL,
    revoked         BOOLEAN      NOT NULL DEFAULT FALSE,
    revoked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- OTP for phone verification (short-lived, cleared after use)
CREATE TABLE auth.otp_codes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone           VARCHAR(20)  NOT NULL,
    code_hash       VARCHAR(255) NOT NULL,
    purpose         VARCHAR(32)  NOT NULL,  -- REGISTRATION, LOGIN, PASSWORD_RESET
    expires_at      TIMESTAMPTZ  NOT NULL,
    attempts        INT          NOT NULL DEFAULT 0,
    used            BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE auth.outbox_events (
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
CREATE INDEX idx_users_phone ON auth.users(phone);
CREATE INDEX idx_refresh_tokens_user_id ON auth.refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON auth.refresh_tokens(token_hash);
CREATE INDEX idx_otp_codes_phone ON auth.otp_codes(phone, purpose);
CREATE INDEX idx_outbox_status ON auth.outbox_events(status, created_at);
