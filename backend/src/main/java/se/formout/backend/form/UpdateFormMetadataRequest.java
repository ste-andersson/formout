package se.formout.backend.form;

import jakarta.validation.constraints.NotBlank;

public record UpdateFormMetadataRequest(
        @NotBlank String title,
        String description
) {
}
