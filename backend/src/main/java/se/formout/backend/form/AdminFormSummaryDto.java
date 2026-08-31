package se.formout.backend.form;

import java.time.Instant;
import java.util.UUID;

public record AdminFormSummaryDto(
        UUID id,
        String title,
        String slug,
        FormStatus status,
        int currentVersion,
        Instant updatedAt
) {
}
