package se.formout.backend.form;

import com.fasterxml.jackson.annotation.JsonRawValue;

import java.time.Instant;
import java.util.UUID;

public record FormDetailDto(
        UUID id,
        String title,
        String description,
        String slug,
        int currentVersion,
        @JsonRawValue String schema,
        Instant updatedAt
) {
}
