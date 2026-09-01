package se.formout.backend.form.interpretation;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import se.formout.backend.form.schema.FormSchema;

@RestController
@RequestMapping("/api/admin/forms")
public class FormInterpretationController {

    private final OpenAiFormInterpreter interpreter;

    public FormInterpretationController(OpenAiFormInterpreter interpreter) {
        this.interpreter = interpreter;
    }

    @PostMapping("/interpret")
    public FormSchema interpret(@RequestParam("file") MultipartFile file) {
        return interpreter.interpret(file);
    }
}
