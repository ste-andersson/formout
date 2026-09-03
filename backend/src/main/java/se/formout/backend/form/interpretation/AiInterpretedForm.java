package se.formout.backend.form.interpretation;

import java.util.List;

public record AiInterpretedForm(
        String title,
        String description,
        List<AiInterpretedField> fields
) {
}
