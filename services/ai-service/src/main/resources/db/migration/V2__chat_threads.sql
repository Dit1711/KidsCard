-- EPIC-4 phase 1b: separate conversations ("topics") per child.
CREATE TABLE ai.chat_threads (
    id         uuid PRIMARY KEY,
    child_id   uuid         NOT NULL,
    title      varchar(120),
    created_at timestamptz  NOT NULL,
    updated_at timestamptz  NOT NULL
);
CREATE INDEX idx_chat_threads_child ON ai.chat_threads (child_id, updated_at DESC);

-- Attach each message to a thread (nullable: pre-existing test messages stay legacy).
ALTER TABLE ai.chat_messages ADD COLUMN thread_id uuid;
CREATE INDEX idx_chat_messages_thread ON ai.chat_messages (thread_id, created_at);
