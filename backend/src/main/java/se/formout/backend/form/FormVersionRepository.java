package se.formout.backend.form;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface FormVersionRepository extends JpaRepository<FormVersion, UUID> {

    Optional<FormVersion> findByFormIdAndVersionNumber(UUID formId, int versionNumber);
}
