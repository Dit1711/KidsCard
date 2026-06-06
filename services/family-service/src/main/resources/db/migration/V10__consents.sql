-- KYC-04: parental e-consent. Immutable acceptance records (audit / ЗРУ).
CREATE TABLE family.consents (
    id         uuid PRIMARY KEY,
    user_id    uuid         NOT NULL,
    type       varchar(32)  NOT NULL,   -- TERMS | PRIVACY | CHILD_DATA
    version    varchar(16)  NOT NULL,
    ip_address varchar(64),
    user_agent varchar(512),
    granted_at timestamptz  NOT NULL
);
CREATE INDEX idx_consents_user ON family.consents (user_id, type, version);
