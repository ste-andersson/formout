package se.formout.backend.form;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FormRepository extends JpaRepository<Form, UUID> {

    List<Form> findByStatusOrderByUpdatedAtDesc(FormStatus status);

    Optional<Form> findBySlug(String slug);
}
