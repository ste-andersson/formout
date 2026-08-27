package se.formout.backend.form;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class FormService {

    private final FormRepository formRepository;
    private final FormVersionRepository formVersionRepository;

    public FormService(FormRepository formRepository, FormVersionRepository formVersionRepository) {
        this.formRepository = formRepository;
        this.formVersionRepository = formVersionRepository;
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

    public Optional<FormDetailDto> getPublishedForm(String slug) {
        return formRepository.findBySlug(slug)
                .filter(form -> form.getStatus() == FormStatus.PUBLISHED)
                .flatMap(form -> formVersionRepository
                        .findByFormIdAndVersionNumber(form.getId(), form.getCurrentVersion())
                        .map(version -> new FormDetailDto(
                                form.getId(),
                                form.getTitle(),
                                form.getDescription(),
                                form.getSlug(),
                                form.getCurrentVersion(),
                                version.getSchemaJson(),
                                form.getUpdatedAt())));
    }
}
