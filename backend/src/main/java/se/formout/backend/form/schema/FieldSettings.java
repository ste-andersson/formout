package se.formout.backend.form.schema;

import java.util.List;

public record FieldSettings(
        Integer min,
        Integer max,
        String minLabel,
        String maxLabel,
        List<String> options
) {
}
