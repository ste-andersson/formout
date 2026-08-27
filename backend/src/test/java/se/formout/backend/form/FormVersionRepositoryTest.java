package se.formout.backend.form;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class FormVersionRepositoryTest {

    @Autowired
    private FormRepository formRepository;

    @Autowired
    private FormVersionRepository formVersionRepository;

    @Test
    void savesAndReloadsAFormVersion() {
        Instant now = Instant.now();
        Form form = formRepository.save(new Form(UUID.randomUUID(), "user-1", "Wellbeing form",
                "Example form", "wellbeing-form-" + UUID.randomUUID(), FormStatus.DRAFT, 1, now, now));

        FormVersion version = new FormVersion(UUID.randomUUID(), form.getId(), 1,
                "{\"schemaVersion\":1}", now);

        FormVersion saved = formVersionRepository.save(version);

        Optional<FormVersion> found = formVersionRepository.findById(saved.getId());
        assertTrue(found.isPresent());
        assertEquals(form.getId(), found.get().getFormId());
        assertEquals(1, found.get().getVersionNumber());
        assertEquals("{\"schemaVersion\":1}", found.get().getSchemaJson());
    }
}
