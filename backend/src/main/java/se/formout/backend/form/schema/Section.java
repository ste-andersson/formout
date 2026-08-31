package se.formout.backend.form.schema;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record Section(
        @NotBlank String id,
        @NotBlank String title,
        @NotEmpty List<@Valid Field> fields
) {
}
