package se.formout.backend.form.schema;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record FormSchema(
        @NotNull @Min(1) Integer schemaVersion,
        @NotBlank String title,
        String description,
        @NotEmpty List<@Valid Section> sections
) {
}
