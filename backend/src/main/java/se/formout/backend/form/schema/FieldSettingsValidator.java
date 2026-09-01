package se.formout.backend.form.schema;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class FieldSettingsValidator implements ConstraintValidator<ValidFieldSettings, Field> {

    @Override
    public boolean isValid(Field field, ConstraintValidatorContext context) {
        if (field == null || field.type() == null || field.settings() == null) {
            return true;
        }

        FieldSettings settings = field.settings();

        return switch (field.type()) {
            case SCALE -> settings.min() != null && settings.max() != null && settings.min() < settings.max();
            case SINGLE_CHOICE, MULTIPLE_CHOICE -> settings.options() != null && !settings.options().isEmpty();
            case TEXT, TEXTAREA, NUMBER, CHECKBOX, HEADING, SUBHEADING, PARAGRAPH -> true;
        };
    }
}
