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
class FormRepositoryTest {

    @Autowired
    private FormRepository formRepository;

    @Test
    void savesAndReloadsAForm() {
        Instant now = Instant.now();
        Form form = new Form(UUID.randomUUID(), "user-1", "Wellbeing form", "Example form",
                "wellbeing-form-" + UUID.randomUUID(), FormStatus.DRAFT, 1, now, now);

        Form saved = formRepository.save(form);

        Optional<Form> found = formRepository.findById(saved.getId());
        assertTrue(found.isPresent());
        assertEquals("Wellbeing form", found.get().getTitle());
        assertEquals(FormStatus.DRAFT, found.get().getStatus());
    }
}
