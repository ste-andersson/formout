package se.formout.backend.form.schema;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

/**
 * Validates cross-property invariants on a {@link Field} that a single
 * {@code @NotBlank}/{@code @NotNull} can't express on its own: which settings
 * are required depends on the field's type, and a label is required for
 * every type except DIVIDER (a plain visual divider line has no text).
 */
public class FieldSettingsValidator implements ConstraintValidator<ValidFieldSettings, Field> {

    @Override
    public boolean isValid(Field field, ConstraintValidatorContext context) {
        if (field == null || field.type() == null) {
            return true;
        }

        if (field.type() != FieldType.DIVIDER && (field.label() == null || field.label().isBlank())) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate("label must not be blank for this field type")
                    .addConstraintViolation();
            return false;
        }

        if (field.settings() == null) {
            return true;
        }

        FieldSettings settings = field.settings();

        return switch (field.type()) {
            case SCALE -> settings.min() != null && settings.max() != null && settings.min() < settings.max();
            case SINGLE_CHOICE, MULTIPLE_CHOICE -> settings.options() != null && !settings.options().isEmpty();
            case TEXT, TEXTAREA, NUMBER, CHECKBOX, HEADING, SUBHEADING, PARAGRAPH, DIVIDER -> true;
        };
    }
}
