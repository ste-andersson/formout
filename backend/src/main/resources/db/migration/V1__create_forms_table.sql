CREATE TABLE forms (
    id               UUID PRIMARY KEY,
    user_id          VARCHAR(255) NOT NULL,
    title            VARCHAR(255) NOT NULL,
    description      TEXT,
    slug             VARCHAR(255) NOT NULL UNIQUE,
    status           VARCHAR(50) NOT NULL,
    current_version  INTEGER NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL,
    updated_at       TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_forms_user_id ON forms (user_id);
CREATE INDEX idx_forms_status ON forms (status);
