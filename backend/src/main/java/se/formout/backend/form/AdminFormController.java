package se.formout.backend.form;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/forms")
public class AdminFormController {

    private final AdminFormService adminFormService;

    public AdminFormController(AdminFormService adminFormService) {
        this.adminFormService = adminFormService;
    }

    @PostMapping
    public ResponseEntity<AdminFormDetailDto> create(@AuthenticationPrincipal Jwt jwt,
                                                       @Valid @RequestBody CreateFormRequest request) {
        AdminFormDetailDto created = adminFormService.createForm(jwt.getSubject(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping
    public List<AdminFormSummaryDto> listMine(@AuthenticationPrincipal Jwt jwt) {
        return adminFormService.listMyForms(jwt.getSubject());
    }

    @GetMapping("/{id}")
    public AdminFormDetailDto get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return adminFormService.getMyForm(jwt.getSubject(), id);
    }

    @PatchMapping("/{id}")
    public AdminFormDetailDto updateMetadata(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                                              @Valid @RequestBody UpdateFormMetadataRequest request) {
        return adminFormService.updateMetadata(jwt.getSubject(), id, request);
    }

    @PostMapping("/{id}/versions")
    public AdminFormDetailDto addVersion(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                                          @Valid @RequestBody AddFormVersionRequest request) {
        return adminFormService.addVersion(jwt.getSubject(), id, request);
    }

    @PostMapping("/{id}/publish")
    public AdminFormDetailDto publish(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return adminFormService.publish(jwt.getSubject(), id);
    }

    @PostMapping("/{id}/archive")
    public AdminFormDetailDto archive(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return adminFormService.archive(jwt.getSubject(), id);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        adminFormService.deleteForm(jwt.getSubject(), id);
        return ResponseEntity.noContent().build();
    }
}
