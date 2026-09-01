package se.formout.backend.form.interpretation;

import java.util.List;

public record AiInterpretedSection(
        String title,
        List<AiInterpretedField> fields
) {
}
