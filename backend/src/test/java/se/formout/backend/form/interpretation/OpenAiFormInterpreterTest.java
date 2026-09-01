package se.formout.backend.form.interpretation;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import se.formout.backend.form.schema.Field;
import se.formout.backend.form.schema.FieldSettings;
import se.formout.backend.form.schema.FieldType;
import se.formout.backend.form.schema.FormSchema;
import se.formout.backend.form.schema.Section;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class OpenAiFormInterpreterTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void mapsAMockedAiResponseIntoAFormSchemaWithGeneratedIds() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();

        AiInterpretedForm aiForm = new AiInterpretedForm(
                "Wellbeing form",
                null,
                List.of(new AiInterpretedSection(
                        "General questions",
                        List.of(new AiInterpretedField(
                                FieldType.TEXT,
                                "How are you today?",
                                true,
                                new FieldSettings(null, null, null, null, null)
                        ))
                ))
        );
        String outputText = objectMapper.writeValueAsString(aiForm);
        String responseBody = objectMapper.writeValueAsString(Map.of(
                "output", List.of(Map.of(
                        "type", "message",
                        "content", List.of(Map.of(
                                "type", "output_text",
                                "text", outputText
                        ))
                ))
        ));

        server.expect(requestTo("https://api.openai.com/v1/responses"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(responseBody, MediaType.APPLICATION_JSON));

        OpenAiFormInterpreter interpreter = new OpenAiFormInterpreter(builder, objectMapper, "test-key", "gpt-test");
        MockMultipartFile file = new MockMultipartFile("file", "form.jpg", "image/jpeg", new byte[]{1, 2, 3});

        FormSchema schema = interpreter.interpret(file);

        server.verify();
        assertEquals("Wellbeing form", schema.title());
        assertEquals(1, schema.sections().size());

        Section section = schema.sections().get(0);
        assertEquals("General questions", section.title());
        assertNotNull(section.id());

        Field field = section.fields().get(0);
        assertEquals(FieldType.TEXT, field.type());
        assertEquals("How are you today?", field.label());
        assertNotNull(field.id());
    }

    @Test
    void rejectsInterpretationWhenNoApiKeyIsConfigured() {
        OpenAiFormInterpreter interpreter =
                new OpenAiFormInterpreter(RestClient.builder(), objectMapper, "", "gpt-test");
        MockMultipartFile file = new MockMultipartFile("file", "form.jpg", "image/jpeg", new byte[]{1});

        assertThrows(IllegalStateException.class, () -> interpreter.interpret(file));
    }
}
