package se.formout.backend.form.interpretation;

import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.chat.response.ChatResponse;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import se.formout.backend.form.schema.Field;
import se.formout.backend.form.schema.FieldSettings;
import se.formout.backend.form.schema.FieldType;
import se.formout.backend.form.schema.FormSchema;
import tools.jackson.databind.ObjectMapper;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OpenAiFormInterpreterTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void mapsAMockedAiResponseIntoAFormSchemaWithGeneratedIds() {
        ChatModel chatModel = mock(ChatModel.class);

        AiInterpretedForm aiForm = new AiInterpretedForm(
                "Wellbeing form",
                null,
                List.of(new AiInterpretedField(
                        FieldType.TEXT,
                        "How are you today?",
                        true,
                        new FieldSettings(null, null, null, null, null)
                ))
        );
        String outputText = objectMapper.writeValueAsString(aiForm);
        ChatResponse response = ChatResponse.builder().aiMessage(AiMessage.from(outputText)).build();
        when(chatModel.chat(any(ChatRequest.class))).thenReturn(response);

        OpenAiFormInterpreter interpreter = new OpenAiFormInterpreter(chatModel, objectMapper, "test-key");
        MockMultipartFile file = new MockMultipartFile("file", "form.jpg", "image/jpeg", new byte[]{1, 2, 3});

        FormSchema schema = interpreter.interpret(file);

        verify(chatModel).chat(any(ChatRequest.class));
        assertEquals("Wellbeing form", schema.title());
        assertEquals(1, schema.fields().size());

        Field field = schema.fields().get(0);
        assertEquals(FieldType.TEXT, field.type());
        assertEquals("How are you today?", field.label());
        assertNotNull(field.id());
    }

    @Test
    void rejectsInterpretationWhenNoApiKeyIsConfigured() {
        OpenAiFormInterpreter interpreter =
                new OpenAiFormInterpreter(mock(ChatModel.class), objectMapper, "");
        MockMultipartFile file = new MockMultipartFile("file", "form.jpg", "image/jpeg", new byte[]{1});

        assertThrows(IllegalStateException.class, () -> interpreter.interpret(file));
    }
}
