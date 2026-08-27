package se.formout.backend.form;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FormService {

    private final FormRepository formRepository;

    public FormService(FormRepository formRepository) {
        this.formRepository = formRepository;
    }

    public List<FormSummaryDto> listPublishedForms() {
        return formRepository.findByStatusOrderByUpdatedAtDesc(FormStatus.PUBLISHED).stream()
                .map(form -> new FormSummaryDto(
                        form.getId(),
                        form.getTitle(),
                        form.getDescription(),
                        form.getSlug(),
                        form.getUpdatedAt()))
                .toList();
    }
}
