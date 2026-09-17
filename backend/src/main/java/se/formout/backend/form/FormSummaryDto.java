package se.formout.backend.form;

import java.time.Instant;
import java.util.UUID;

public record FormSummaryDto(
        UUID id,
        String title,
        String description,
        String slug,
        boolean active,
        Instant updatedAt
) {
}
