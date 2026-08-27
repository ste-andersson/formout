package se.formout.backend.form;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/forms")
public class FormController {

    private final FormService formService;

    public FormController(FormService formService) {
        this.formService = formService;
    }

    @GetMapping
    public List<FormSummaryDto> listPublishedForms() {
        return formService.listPublishedForms();
    }

    @GetMapping("/{slug}")
    public ResponseEntity<FormDetailDto> getPublishedForm(@PathVariable String slug) {
        return formService.getPublishedForm(slug)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
