package se.formout.backend.form.schema;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertTrue;

class FormSchemaValidationTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void aWellFormedSchemaHasNoViolations() {
        FormSchema schema = new FormSchema(1, "Wellbeing form", "Example without patient data", List.of(
                new Section("section-1", "General questions", List.of(
                        new Field("field-1", FieldType.TEXT, "How are you today?", true,
                                new FieldSettings(null, null, null, null, null)),
                        new Field("field-2", FieldType.SCALE, "Rate your wellbeing", true,
                                new FieldSettings(1, 10, "Very poor", "Very good", null))
                ))
        ));

        Set<ConstraintViolation<FormSchema>> violations = validator.validate(schema);

        assertTrue(violations.isEmpty(), violations::toString);
    }

    @Test
    void aScaleFieldWithoutMinAndMaxIsRejected() {
        Field field = new Field("field-1", FieldType.SCALE, "Rate your wellbeing", true,
                new FieldSettings(null, null, null, null, null));

        Set<ConstraintViolation<Field>> violations = validator.validate(field);

        assertTrue(violations.stream().anyMatch(v -> v.getMessage().contains("settings")));
    }

    @Test
    void aChoiceFieldWithoutOptionsIsRejected() {
        Field field = new Field("field-1", FieldType.SINGLE_CHOICE, "Pick one", true,
                new FieldSettings(null, null, null, null, List.of()));

        Set<ConstraintViolation<Field>> violations = validator.validate(field);

        assertTrue(violations.stream().anyMatch(v -> v.getMessage().contains("settings")));
    }

    @Test
    void aTextFieldWithEmptySettingsIsAccepted() {
        Field field = new Field("field-1", FieldType.TEXT, "How are you today?", true,
                new FieldSettings(null, null, null, null, null));

        Set<ConstraintViolation<Field>> violations = validator.validate(field);

        assertTrue(violations.isEmpty(), violations::toString);
    }

    @Test
    void aSchemaWithoutSectionsIsRejected() {
        FormSchema schema = new FormSchema(1, "Empty form", null, List.of());

        Set<ConstraintViolation<FormSchema>> violations = validator.validate(schema);

        assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("sections")));
    }
}
