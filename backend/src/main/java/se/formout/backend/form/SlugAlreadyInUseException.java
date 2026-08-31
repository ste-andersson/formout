package se.formout.backend.form;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class SlugAlreadyInUseException extends RuntimeException {

    public SlugAlreadyInUseException(String slug) {
        super("Slug already in use: " + slug);
    }
}
