package se.formout.backend.form.schema;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@ValidFieldSettings
public record Field(
        @NotBlank String id,
        @NotNull FieldType type,
        String label,
        boolean required,
        @NotNull @Valid FieldSettings settings
) {
}
