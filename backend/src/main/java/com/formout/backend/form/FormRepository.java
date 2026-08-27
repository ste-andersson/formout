package com.formout.backend.form;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface FormRepository extends JpaRepository<Form, UUID> {
}
