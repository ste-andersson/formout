package se.formout.backend.form;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import se.formout.backend.form.schema.Field;
import se.formout.backend.form.schema.FieldSettings;
import se.formout.backend.form.schema.FieldType;
import se.formout.backend.form.schema.FormSchema;
import se.formout.backend.form.schema.Section;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminFormControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private FormSchema validSchema() {
        return new FormSchema(1, "Wellbeing form", "Example", List.of(
                new Section("section-1", "General questions", List.of(
                        new Field("field-1", FieldType.TEXT, "How are you today?", true,
                                new FieldSettings(null, null, null, null, null))
                ))
        ));
    }

    private CreateFormRequest createRequest(String slug) {
        return new CreateFormRequest("Wellbeing form", "Example", slug, validSchema());
    }

    @Test
    void createsAFormAsADraftWithVersionOne() throws Exception {
        String slug = "wellbeing-" + UUID.randomUUID();

        mockMvc.perform(post("/api/admin/forms")
                        .with(jwt().jwt(j -> j.subject("user-1")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest(slug))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.currentVersion").value(1))
                .andExpect(jsonPath("$.schema.title").value("Wellbeing form"));
    }

    @Test
    void rejectsADuplicateSlug() throws Exception {
        String slug = "wellbeing-" + UUID.randomUUID();
        mockMvc.perform(post("/api/admin/forms")
                        .with(jwt().jwt(j -> j.subject("user-1")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest(slug))))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/admin/forms")
                        .with(jwt().jwt(j -> j.subject("user-2")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest(slug))))
                .andExpect(status().isConflict());
    }

    @Test
    void rejectsAnInvalidSchema() throws Exception {
        CreateFormRequest invalid = new CreateFormRequest("Bad form", null, "bad-" + UUID.randomUUID(),
                new FormSchema(1, "Bad form", null, List.of()));

        mockMvc.perform(post("/api/admin/forms")
                        .with(jwt().jwt(j -> j.subject("user-1")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void requiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/admin/forms"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void listsOnlyTheCallersOwnForms() throws Exception {
        mockMvc.perform(post("/api/admin/forms")
                .with(jwt().jwt(j -> j.subject("user-a")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createRequest("owned-by-a-" + UUID.randomUUID()))));
        mockMvc.perform(post("/api/admin/forms")
                .with(jwt().jwt(j -> j.subject("user-b")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createRequest("owned-by-b-" + UUID.randomUUID()))));

        mockMvc.perform(get("/api/admin/forms").with(jwt().jwt(j -> j.subject("user-a"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.slug =~ /^owned-by-b.*/)]").doesNotExist());
    }

    @Test
    void ownerCanUpdatePublishArchiveAndDeleteWhileOthersAreRejected() throws Exception {
        String slug = "lifecycle-" + UUID.randomUUID();
        String body = mockMvc.perform(post("/api/admin/forms")
                        .with(jwt().jwt(j -> j.subject("owner")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest(slug))))
                .andReturn().getResponse().getContentAsString();
        String id = objectMapper.readTree(body).get("id").asString();

        // A non-owner cannot see or modify it.
        mockMvc.perform(get("/api/admin/forms/{id}", id).with(jwt().jwt(j -> j.subject("someone-else"))))
                .andExpect(status().isNotFound());
        mockMvc.perform(post("/api/admin/forms/{id}/publish", id).with(jwt().jwt(j -> j.subject("someone-else"))))
                .andExpect(status().isNotFound());

        // The owner can update metadata.
        mockMvc.perform(patch("/api/admin/forms/{id}", id)
                        .with(jwt().jwt(j -> j.subject("owner")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdateFormMetadataRequest("New title", "New description"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("New title"));

        // The owner can add a new version.
        mockMvc.perform(post("/api/admin/forms/{id}/versions", id)
                        .with(jwt().jwt(j -> j.subject("owner")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new AddFormVersionRequest(validSchema()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentVersion").value(2));

        // The owner can publish it, after which it is publicly visible.
        mockMvc.perform(post("/api/admin/forms/{id}/publish", id).with(jwt().jwt(j -> j.subject("owner"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"));
        mockMvc.perform(get("/api/forms/{slug}", slug))
                .andExpect(status().isOk());

        // The owner can archive it, after which it is no longer publicly visible.
        mockMvc.perform(post("/api/admin/forms/{id}/archive", id).with(jwt().jwt(j -> j.subject("owner"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ARCHIVED"));
        mockMvc.perform(get("/api/forms/{slug}", slug))
                .andExpect(status().isNotFound());

        // The owner can delete it.
        mockMvc.perform(delete("/api/admin/forms/{id}", id).with(jwt().jwt(j -> j.subject("owner"))))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/admin/forms/{id}", id).with(jwt().jwt(j -> j.subject("owner"))))
                .andExpect(status().isNotFound());
    }
}
