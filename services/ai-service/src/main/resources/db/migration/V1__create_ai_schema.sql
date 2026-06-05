-- EPIC-4: AI tutor conversation history.
CREATE TABLE ai.chat_messages (
    id         uuid PRIMARY KEY,
    child_id   uuid        NOT NULL,
    role       varchar(16) NOT NULL,
    content    text        NOT NULL,
    created_at timestamptz NOT NULL
);

CREATE INDEX idx_chat_messages_child_time ON ai.chat_messages (child_id, created_at);
