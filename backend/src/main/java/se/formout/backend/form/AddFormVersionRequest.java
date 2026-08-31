package se.formout.backend.form;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import se.formout.backend.form.schema.FormSchema;

public record AddFormVersionRequest(
        @NotNull @Valid FormSchema schema
) {
}
