-- Compliance service schema: the immutable, hash-chained audit trail.
--
-- Every money/data event from the other services (delivered over Kafka) is
-- recorded here exactly once and never changed. Two guarantees:
--   1. Append-only at the DB level — UPDATE/DELETE are blocked by a trigger, so
--      even a compromised service account cannot rewrite or erase history.
--   2. Tamper-evident — each row's entry_hash chains the previous row's hash;
--      altering or dropping any past row breaks every hash that follows.

CREATE TABLE compliance.audit_log (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seq          BIGINT GENERATED ALWAYS AS IDENTITY,
    event_type   VARCHAR(128) NOT NULL,        -- e.g. payment.transaction.completed
    topic        VARCHAR(64)  NOT NULL,        -- source Kafka topic
    aggregate_id UUID,                          -- entity the event is about (tx/card/...)
    family_id    UUID,                          -- scope, when known
    payload      JSONB,                         -- the raw event
    prev_hash    VARCHAR(64)  NOT NULL,         -- entry_hash of the previous row (chain)
    entry_hash   VARCHAR(64)  NOT NULL,         -- SHA-256 over this row's content + prev_hash
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_audit_seq    ON compliance.audit_log(seq);
CREATE INDEX        idx_audit_family ON compliance.audit_log(family_id, seq DESC);
CREATE INDEX        idx_audit_event  ON compliance.audit_log(event_type, seq DESC);

-- Append-only enforcement: reject any attempt to modify or delete an entry.
CREATE OR REPLACE FUNCTION compliance.audit_log_append_only()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'compliance.audit_log is append-only: % is not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_log_append_only
    BEFORE UPDATE OR DELETE ON compliance.audit_log
    FOR EACH ROW EXECUTE FUNCTION compliance.audit_log_append_only();
