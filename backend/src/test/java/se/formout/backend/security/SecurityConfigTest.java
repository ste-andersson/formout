package se.formout.backend.security;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void publicFormEndpointsDoNotRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/forms"))
                .andExpect(status().isOk());
    }

    @Test
    void meEndpointRejectsRequestsWithoutAToken() throws Exception {
        mockMvc.perform(get("/api/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void meEndpointReturnsTheAuthenticatedUsersId() throws Exception {
        mockMvc.perform(get("/api/me").with(jwt().jwt(builder -> builder.subject("user-123"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value("user-123"));
    }
}
