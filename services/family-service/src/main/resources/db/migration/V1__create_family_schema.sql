-- Family service schema: FAMILY, PARENT, CHILD, CHORE, SAVINGS_GOAL entities

CREATE TABLE family.families (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    status      VARCHAR(32)  NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE, SUSPENDED, CLOSED
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version     BIGINT       NOT NULL DEFAULT 0
);

CREATE TABLE family.parents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id       UUID         NOT NULL REFERENCES family.families(id),
    role            VARCHAR(32)  NOT NULL,               -- OWNER, CO_PARENT
    user_id         UUID         NOT NULL UNIQUE,        -- FK to auth.users
    phone           VARCHAR(20)  NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    kyc_status      VARCHAR(32)  NOT NULL DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, APPROVED, REJECTED
    kyc_verified_at TIMESTAMPTZ,
    status          VARCHAR(32)  NOT NULL DEFAULT 'ACTIVE',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version         BIGINT       NOT NULL DEFAULT 0
);

CREATE TABLE family.children (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id       UUID         NOT NULL REFERENCES family.families(id),
    full_name       VARCHAR(255) NOT NULL,
    date_of_birth   DATE         NOT NULL,
    age_group       VARCHAR(16)  NOT NULL,               -- CHILD_6_10, CHILD_11_14, TEEN_15_17
    avatar_url      VARCHAR(500),
    status          VARCHAR(32)  NOT NULL DEFAULT 'ACTIVE',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version         BIGINT       NOT NULL DEFAULT 0
);

CREATE TABLE family.limit_rules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id        UUID         NOT NULL REFERENCES family.children(id),
    limit_type      VARCHAR(32)  NOT NULL,               -- DAILY, WEEKLY, MONTHLY, CATEGORY
    category        VARCHAR(64),                         -- MCC category if CATEGORY type
    amount_uzs      BIGINT       NOT NULL,               -- amount in tiyin (1/100 UZS)
    currency        VARCHAR(3)   NOT NULL DEFAULT 'UZS',
    active          BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by      UUID         NOT NULL,               -- parent_id who set the rule
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE family.savings_goals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id        UUID         NOT NULL REFERENCES family.children(id),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    target_amount   BIGINT       NOT NULL,               -- in tiyin
    current_amount  BIGINT       NOT NULL DEFAULT 0,
    currency        VARCHAR(3)   NOT NULL DEFAULT 'UZS',
    deadline        DATE,
    status          VARCHAR(32)  NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, COMPLETED, CANCELLED
    image_url       VARCHAR(500),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version         BIGINT       NOT NULL DEFAULT 0
);

CREATE TABLE family.chores (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id       UUID         NOT NULL REFERENCES family.families(id),
    child_id        UUID         NOT NULL REFERENCES family.children(id),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    reward_amount   BIGINT       NOT NULL DEFAULT 0,     -- in tiyin
    due_date        DATE,
    recurrence      VARCHAR(32),                         -- NONE, DAILY, WEEKLY
    status          VARCHAR(32)  NOT NULL DEFAULT 'PENDING', -- PENDING, DONE, APPROVED, REJECTED
    completed_at    TIMESTAMPTZ,
    approved_by     UUID,                                -- parent_id
    approved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE family.outbox_events (
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
CREATE INDEX idx_parents_family_id ON family.parents(family_id);
CREATE INDEX idx_parents_user_id ON family.parents(user_id);
CREATE INDEX idx_children_family_id ON family.children(family_id);
CREATE INDEX idx_limit_rules_child_id ON family.limit_rules(child_id);
CREATE INDEX idx_savings_goals_child_id ON family.savings_goals(child_id);
CREATE INDEX idx_chores_child_id ON family.chores(child_id);
CREATE INDEX idx_chores_family_id ON family.chores(family_id);
CREATE INDEX idx_outbox_status ON family.outbox_events(status, created_at);
