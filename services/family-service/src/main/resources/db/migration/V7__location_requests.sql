-- EPIC-1A: on-demand "where are you now?" location requests (pull model).
CREATE TABLE family.location_requests (
    id                uuid PRIMARY KEY,
    family_id         uuid        NOT NULL,
    child_id          uuid        NOT NULL,
    requested_by      uuid        NOT NULL,
    status            varchar(16) NOT NULL,
    created_at        timestamptz NOT NULL,
    fulfilled_at      timestamptz,
    result_lat        double precision,
    result_lng        double precision,
    result_accuracy_m double precision
);

CREATE INDEX idx_location_requests_child_status
    ON family.location_requests (child_id, status, created_at DESC);
