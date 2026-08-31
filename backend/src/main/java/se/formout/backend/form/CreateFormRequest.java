package se.formout.backend.form;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import se.formout.backend.form.schema.FormSchema;

public record CreateFormRequest(
        @NotBlank String title,
        String description,
        @NotBlank String slug,
        @NotNull @Valid FormSchema schema
) {
}
