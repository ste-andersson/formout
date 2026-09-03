package se.formout.backend.form.interpretation;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;
import se.formout.backend.form.schema.Field;
import se.formout.backend.form.schema.FieldSettings;
import se.formout.backend.form.schema.FormSchema;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Sends an uploaded form image or PDF to OpenAI's Responses API and turns
 * the structured JSON it returns into a real {@link FormSchema}. The model
 * is not asked for field ids — it has no meaningful way to choose good
 * ones, so fresh ids are generated here after parsing.
 */
@Service
public class OpenAiFormInterpreter {

    private static final String PROMPT = """
            You are extracting the structure of a paper form from an image or PDF into a \
            structured JSON representation. Identify the form's title, an optional short \
            description, and its fields, listed in the order they appear on the form, top \
            to bottom.

            Each field has:
            - type: TEXT (short single-line answer), TEXTAREA (longer multi-line answer), \
            NUMBER (numeric answer), CHECKBOX (a single yes/no checkbox), SINGLE_CHOICE \
            (choose exactly one option), MULTIPLE_CHOICE (choose one or more options), SCALE \
            (a numeric rating scale), HEADING or SUBHEADING (a heading-like line of text that \
            is not itself a question), PARAGRAPH (explanatory text that is not a question), \
            DIVIDER (a plain dividing line on the form with no text of its own).
            - label: the question text, or the heading/paragraph text. Leave empty for DIVIDER.
            - required: whether the form marks the field as mandatory.
            - settings: for SINGLE_CHOICE/MULTIPLE_CHOICE, the list of options; for SCALE, \
            min, max, and optional labels for the two endpoints; otherwise leave every \
            settings field null.

            Preserve the original language of the form's text. Do not invent content that is \
            not present in the form, and do not invent headings or group fields under a \
            heading that isn't actually printed on the form.""";

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String model;

    public OpenAiFormInterpreter(
            RestClient.Builder restClientBuilder,
            ObjectMapper objectMapper,
            @Value("${app.openai.api-key}") String apiKey,
            @Value("${app.openai.model}") String model) {
        this.restClient = restClientBuilder.baseUrl("https://api.openai.com/v1").build();
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.model = model;
    }

    public FormSchema interpret(MultipartFile file) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("OPENAI_API_KEY is not configured");
        }

        Map<String, Object> requestBody = Map.of(
                "model", model,
                "input", List.of(Map.of(
                        "role", "user",
                        "content", List.of(buildFileContent(file), Map.of("type", "input_text", "text", PROMPT))
                )),
                "text", Map.of("format", Map.of(
                        "type", "json_schema",
                        "name", "form_schema",
                        "schema", buildResponseSchema()
                )),
                "reasoning", Map.of("effort", "low")
        );

        JsonNode response = restClient.post()
                .uri("/responses")
                .header("Authorization", "Bearer " + apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(JsonNode.class);

        String outputText = extractOutputText(response);
        AiInterpretedForm interpreted = objectMapper.readValue(outputText, AiInterpretedForm.class);
        return toFormSchema(interpreted);
    }

    /**
     * The raw Responses API has no top-level "output_text" field — that
     * convenience shortcut is only computed client-side by OpenAI's official
     * SDKs. Since we call the HTTP API directly, the JSON text has to be
     * found by walking the "output" array for the "message" item and reading
     * its "output_text" content part.
     */
    private static String extractOutputText(JsonNode response) {
        for (JsonNode item : response.path("output")) {
            if (!"message".equals(item.path("type").asString())) {
                continue;
            }
            for (JsonNode part : item.path("content")) {
                if ("output_text".equals(part.path("type").asString())) {
                    return part.path("text").asString();
                }
            }
        }
        throw new IllegalStateException("OpenAI response contained no message output: " + response);
    }

    private Map<String, Object> buildFileContent(MultipartFile file) {
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new IllegalStateException("Failed to read uploaded file", e);
        }
        String base64 = Base64.getEncoder().encodeToString(bytes);

        if ("application/pdf".equals(file.getContentType())) {
            String filename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "form.pdf";
            return Map.of(
                    "type", "input_file",
                    "filename", filename,
                    "file_data", "data:application/pdf;base64," + base64
            );
        }

        String mimeType = file.getContentType() != null ? file.getContentType() : "image/jpeg";
        return Map.of(
                "type", "input_image",
                "image_url", "data:" + mimeType + ";base64," + base64,
                "detail", "auto"
        );
    }

    private FormSchema toFormSchema(AiInterpretedForm interpreted) {
        List<Field> fields = interpreted.fields().stream().map(this::toField).toList();
        return new FormSchema(1, interpreted.title(), interpreted.description(), fields);
    }

    private Field toField(AiInterpretedField field) {
        FieldSettings settings = field.settings() != null
                ? field.settings()
                : new FieldSettings(null, null, null, null, null);
        String label = field.label() != null ? field.label() : "";
        return new Field(UUID.randomUUID().toString(), field.type(), label, field.required(), settings);
    }

    private static Map<String, Object> buildResponseSchema() {
        Map<String, Object> settingsSchema = objectSchema(
                Map.of(
                        "min", nullableType("integer"),
                        "max", nullableType("integer"),
                        "minLabel", nullableType("string"),
                        "maxLabel", nullableType("string"),
                        "options", Map.of("type", List.of("array", "null"), "items", Map.of("type", "string"))
                ),
                List.of("min", "max", "minLabel", "maxLabel", "options")
        );

        Map<String, Object> fieldSchema = objectSchema(
                Map.of(
                        "type", Map.of(
                                "type", "string",
                                "enum", List.of(
                                        "TEXT", "TEXTAREA", "NUMBER", "CHECKBOX", "SINGLE_CHOICE",
                                        "MULTIPLE_CHOICE", "SCALE", "HEADING", "SUBHEADING", "PARAGRAPH", "DIVIDER"
                                )
                        ),
                        "label", nullableType("string"),
                        "required", Map.of("type", "boolean"),
                        "settings", settingsSchema
                ),
                List.of("type", "label", "required", "settings")
        );

        return objectSchema(
                Map.of(
                        "title", Map.of("type", "string"),
                        "description", nullableType("string"),
                        "fields", Map.of("type", "array", "items", fieldSchema)
                ),
                List.of("title", "description", "fields")
        );
    }

    private static Map<String, Object> objectSchema(Map<String, Object> properties, List<String> required) {
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("type", "object");
        schema.put("properties", properties);
        schema.put("required", required);
        schema.put("additionalProperties", false);
        return schema;
    }

    private static Map<String, Object> nullableType(String type) {
        return Map.of("type", List.of(type, "null"));
    }
}
