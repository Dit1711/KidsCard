-- Card personalization: background theme (gradient) + optional pattern overlay.
ALTER TABLE card.kids_cards
    ADD COLUMN theme   VARCHAR(32) NOT NULL DEFAULT 'violet',
    ADD COLUMN pattern VARCHAR(32) NOT NULL DEFAULT 'none';
