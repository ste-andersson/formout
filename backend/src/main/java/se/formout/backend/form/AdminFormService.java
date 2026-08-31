package se.formout.backend.form;

import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;
import se.formout.backend.form.schema.FormSchema;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class AdminFormService {

    private final FormRepository formRepository;
    private final FormVersionRepository formVersionRepository;
    private final ObjectMapper objectMapper;

    public AdminFormService(FormRepository formRepository, FormVersionRepository formVersionRepository,
                             ObjectMapper objectMapper) {
        this.formRepository = formRepository;
        this.formVersionRepository = formVersionRepository;
        this.objectMapper = objectMapper;
    }

    public AdminFormDetailDto createForm(String userId, CreateFormRequest request) {
        if (formRepository.findBySlug(request.slug()).isPresent()) {
            throw new SlugAlreadyInUseException(request.slug());
        }

        Instant now = Instant.now();
        UUID formId = UUID.randomUUID();

        Form form = new Form(formId, userId, request.title(), request.description(), request.slug(),
                FormStatus.DRAFT, 1, now, now);
        formRepository.save(form);

        FormVersion version = new FormVersion(UUID.randomUUID(), formId, 1, writeSchema(request.schema()), now);
        formVersionRepository.save(version);

        return toDetailDto(form);
    }

    public List<AdminFormSummaryDto> listMyForms(String userId) {
        return formRepository.findByUserIdOrderByUpdatedAtDesc(userId).stream()
                .map(form -> new AdminFormSummaryDto(form.getId(), form.getTitle(), form.getSlug(),
                        form.getStatus(), form.getCurrentVersion(), form.getUpdatedAt()))
                .toList();
    }

    public AdminFormDetailDto getMyForm(String userId, UUID formId) {
        return toDetailDto(requireOwnedForm(userId, formId));
    }

    public AdminFormDetailDto updateMetadata(String userId, UUID formId, UpdateFormMetadataRequest request) {
        Form form = requireOwnedForm(userId, formId);
        form.setTitle(request.title());
        form.setDescription(request.description());
        form.setUpdatedAt(Instant.now());
        formRepository.save(form);
        return toDetailDto(form);
    }

    public AdminFormDetailDto addVersion(String userId, UUID formId, AddFormVersionRequest request) {
        Form form = requireOwnedForm(userId, formId);
        int newVersionNumber = form.getCurrentVersion() + 1;
        Instant now = Instant.now();

        FormVersion version = new FormVersion(UUID.randomUUID(), formId, newVersionNumber,
                writeSchema(request.schema()), now);
        formVersionRepository.save(version);

        form.setCurrentVersion(newVersionNumber);
        form.setUpdatedAt(now);
        formRepository.save(form);

        return toDetailDto(form);
    }

    public AdminFormDetailDto publish(String userId, UUID formId) {
        Form form = requireOwnedForm(userId, formId);
        form.setStatus(FormStatus.PUBLISHED);
        form.setUpdatedAt(Instant.now());
        formRepository.save(form);
        return toDetailDto(form);
    }

    public AdminFormDetailDto archive(String userId, UUID formId) {
        Form form = requireOwnedForm(userId, formId);
        form.setStatus(FormStatus.ARCHIVED);
        form.setUpdatedAt(Instant.now());
        formRepository.save(form);
        return toDetailDto(form);
    }

    public void deleteForm(String userId, UUID formId) {
        formRepository.delete(requireOwnedForm(userId, formId));
    }

    private Form requireOwnedForm(String userId, UUID formId) {
        Form form = formRepository.findById(formId).orElseThrow(FormNotFoundException::new);
        if (!form.getUserId().equals(userId)) {
            throw new FormNotFoundException();
        }
        return form;
    }

    private AdminFormDetailDto toDetailDto(Form form) {
        FormVersion version = formVersionRepository
                .findByFormIdAndVersionNumber(form.getId(), form.getCurrentVersion())
                .orElseThrow(() -> new IllegalStateException(
                        "Missing current version for form " + form.getId()));

        return new AdminFormDetailDto(form.getId(), form.getTitle(), form.getDescription(), form.getSlug(),
                form.getStatus(), form.getCurrentVersion(), readSchema(version.getSchemaJson()), form.getUpdatedAt());
    }

    private String writeSchema(FormSchema schema) {
        return objectMapper.writeValueAsString(schema);
    }

    private FormSchema readSchema(String schemaJson) {
        return objectMapper.readValue(schemaJson, FormSchema.class);
    }
}
