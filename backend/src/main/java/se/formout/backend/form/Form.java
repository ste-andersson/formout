package se.formout.backend.form;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "forms")
public class Form {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(nullable = false)
    private String title;

    @Column
    private String description;

    @Column(nullable = false, unique = true)
    private String slug;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FormStatus status;

    // Owner-set "still relevant" flag, shown to respondents on their home
    // page (current vs. outdated forms) -- deliberately independent of
    // `status`: an outdated form can still be PUBLISHED and fully fillable,
    // this only affects how it's listed, never access.
    @Column(nullable = false)
    private boolean active;

    @Column(name = "current_version", nullable = false)
    private int currentVersion;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Form() {
    }

    public Form(UUID id, String userId, String title, String description, String slug,
                FormStatus status, boolean active, int currentVersion, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.userId = userId;
        this.title = title;
        this.description = description;
        this.slug = slug;
        this.status = status;
        this.active = active;
        this.currentVersion = currentVersion;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public UUID getId() {
        return id;
    }

    public String getUserId() {
        return userId;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public String getSlug() {
        return slug;
    }

    public FormStatus getStatus() {
        return status;
    }

    public boolean isActive() {
        return active;
    }

    public int getCurrentVersion() {
        return currentVersion;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public void setStatus(FormStatus status) {
        this.status = status;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public void setCurrentVersion(int currentVersion) {
        this.currentVersion = currentVersion;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
