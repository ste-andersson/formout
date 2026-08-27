package se.formout.backend.form;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface FormVersionRepository extends JpaRepository<FormVersion, UUID> {
}
