package se.formout.backend.form;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "form_versions")
public class FormVersion {

    @Id
    private UUID id;

    @Column(name = "form_id", nullable = false)
    private UUID formId;

    @Column(name = "version_number", nullable = false)
    private int versionNumber;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "schema_json", nullable = false, columnDefinition = "jsonb")
    private String schemaJson;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected FormVersion() {
    }

    public FormVersion(UUID id, UUID formId, int versionNumber, String schemaJson, Instant createdAt) {
        this.id = id;
        this.formId = formId;
        this.versionNumber = versionNumber;
        this.schemaJson = schemaJson;
        this.createdAt = createdAt;
    }

    public UUID getId() {
        return id;
    }

    public UUID getFormId() {
        return formId;
    }

    public int getVersionNumber() {
        return versionNumber;
    }

    public String getSchemaJson() {
        return schemaJson;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
