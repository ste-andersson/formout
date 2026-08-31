package se.formout.backend.form.schema;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = FieldSettingsValidator.class)
public @interface ValidFieldSettings {

    String message() default "settings do not match the field type";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
