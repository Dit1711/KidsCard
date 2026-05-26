-- KYC service schema: verification sessions, documents, liveness checks

CREATE TABLE kyc.verification_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID         NOT NULL,               -- FK to auth.users
    type            VARCHAR(32)  NOT NULL,               -- PARENT, CO_PARENT
    status          VARCHAR(32)  NOT NULL DEFAULT 'INITIATED', -- INITIATED, DOCUMENTS_UPLOADED, LIVENESS_DONE, APPROVED, REJECTED, EXPIRED
    provider        VARCHAR(64)  NOT NULL,               -- mock, provider_name
    external_id     VARCHAR(255),                        -- provider-side session ID
    rejection_reason TEXT,
    expires_at      TIMESTAMPTZ  NOT NULL,
    approved_at     TIMESTAMPTZ,
    rejected_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE kyc.documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID         NOT NULL REFERENCES kyc.verification_sessions(id),
    doc_type        VARCHAR(32)  NOT NULL,               -- PASSPORT, ID_CARD, DRIVING_LICENSE
    front_url       VARCHAR(500),                        -- encrypted S3 URL
    back_url        VARCHAR(500),
    ocr_result      JSONB,                               -- parsed document data (encrypted)
    status          VARCHAR(32)  NOT NULL DEFAULT 'PENDING', -- PENDING, VERIFIED, REJECTED
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE kyc.liveness_checks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID         NOT NULL REFERENCES kyc.verification_sessions(id),
    video_url       VARCHAR(500),                        -- encrypted S3 URL
    similarity_score NUMERIC(5,4),                      -- face match score 0.0-1.0
    status          VARCHAR(32)  NOT NULL DEFAULT 'PENDING',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE kyc.outbox_events (
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
CREATE INDEX idx_sessions_user_id ON kyc.verification_sessions(user_id);
CREATE INDEX idx_sessions_status ON kyc.verification_sessions(status);
CREATE INDEX idx_documents_session_id ON kyc.documents(session_id);
CREATE INDEX idx_liveness_session_id ON kyc.liveness_checks(session_id);
CREATE INDEX idx_outbox_status ON kyc.outbox_events(status, created_at);
