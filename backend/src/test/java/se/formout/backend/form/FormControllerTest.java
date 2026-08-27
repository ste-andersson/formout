package se.formout.backend.form;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class FormControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FormRepository formRepository;

    @Autowired
    private FormVersionRepository formVersionRepository;

    @Test
    void listsOnlyPublishedForms() throws Exception {
        Instant now = Instant.now();
        formRepository.save(new Form(UUID.randomUUID(), "user-1", "Published form", "desc",
                "published-form-" + UUID.randomUUID(), FormStatus.PUBLISHED, 1, now, now));
        formRepository.save(new Form(UUID.randomUUID(), "user-1", "Draft form", "desc",
                "draft-form-" + UUID.randomUUID(), FormStatus.DRAFT, 1, now, now));

        mockMvc.perform(get("/api/forms"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.title == 'Published form')]").exists())
                .andExpect(jsonPath("$[?(@.title == 'Draft form')]").doesNotExist());
    }

    @Test
    void returnsAPublishedFormWithItsCurrentSchema() throws Exception {
        Instant now = Instant.now();
        String slug = "wellbeing-form-" + UUID.randomUUID();
        Form form = formRepository.save(new Form(UUID.randomUUID(), "user-1", "Wellbeing form", "desc",
                slug, FormStatus.PUBLISHED, 1, now, now));
        formVersionRepository.save(new FormVersion(UUID.randomUUID(), form.getId(), 1,
                "{\"schemaVersion\":1}", now));

        mockMvc.perform(get("/api/forms/{slug}", slug))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Wellbeing form"))
                .andExpect(jsonPath("$.schema.schemaVersion").value(1));
    }

    @Test
    void returnsNotFoundForAnUnpublishedForm() throws Exception {
        Instant now = Instant.now();
        String slug = "draft-form-" + UUID.randomUUID();
        formRepository.save(new Form(UUID.randomUUID(), "user-1", "Draft form", "desc",
                slug, FormStatus.DRAFT, 1, now, now));

        mockMvc.perform(get("/api/forms/{slug}", slug))
                .andExpect(status().isNotFound());
    }

    @Test
    void returnsNotFoundForAnUnknownSlug() throws Exception {
        mockMvc.perform(get("/api/forms/{slug}", "does-not-exist"))
                .andExpect(status().isNotFound());
    }
}
