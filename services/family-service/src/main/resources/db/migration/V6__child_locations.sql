-- EPIC-1A: "where's my child" — one-shot geolocation pings (app-open + purchases).
CREATE TABLE family.child_locations (
    id          uuid PRIMARY KEY,
    family_id   uuid        NOT NULL,
    child_id    uuid        NOT NULL,
    lat         double precision NOT NULL,
    lng         double precision NOT NULL,
    accuracy_m  double precision,
    kind        varchar(16) NOT NULL,
    label       varchar(255),
    amount_uzs  bigint,
    captured_at timestamptz NOT NULL
);

CREATE INDEX idx_child_locations_child_time
    ON family.child_locations (child_id, captured_at DESC);
