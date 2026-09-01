package se.formout.backend.form.interpretation;

import se.formout.backend.form.schema.FieldSettings;
import se.formout.backend.form.schema.FieldType;

/**
 * Same shape as {@link se.formout.backend.form.schema.Field}, minus the id —
 * the AI has no meaningful way to choose one, so the backend generates a
 * fresh id for every field after parsing the model's response.
 */
public record AiInterpretedField(
        FieldType type,
        String label,
        boolean required,
        FieldSettings settings
) {
}
