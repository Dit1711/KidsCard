-- Denormalize family/child onto disputes for efficient listing & ownership checks.
-- (No existing rows — the disputes table has never been written to yet.)
ALTER TABLE payment.disputes ADD COLUMN family_id UUID;
ALTER TABLE payment.disputes ADD COLUMN child_id  UUID;

CREATE INDEX idx_disputes_family_id      ON payment.disputes (family_id);
CREATE INDEX idx_disputes_transaction_id ON payment.disputes (transaction_id);
