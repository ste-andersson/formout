package se.formout.backend.form;

import se.formout.backend.form.schema.FormSchema;

import java.time.Instant;
import java.util.UUID;

public record AdminFormDetailDto(
        UUID id,
        String title,
        String description,
        String slug,
        FormStatus status,
        int currentVersion,
        FormSchema schema,
        Instant updatedAt
) {
}
