CREATE TABLE form_versions (
    id               UUID PRIMARY KEY,
    form_id          UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    version_number   INTEGER NOT NULL,
    schema_json      JSONB NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL,
    UNIQUE (form_id, version_number)
);
