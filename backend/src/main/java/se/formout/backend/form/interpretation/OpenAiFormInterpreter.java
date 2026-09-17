package se.formout.backend.form.interpretation;

import dev.langchain4j.data.message.Content;
import dev.langchain4j.data.message.ImageContent;
import dev.langchain4j.data.message.PdfFileContent;
import dev.langchain4j.data.message.TextContent;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.chat.request.ResponseFormat;
import dev.langchain4j.model.chat.request.ResponseFormatType;
import dev.langchain4j.model.chat.request.json.JsonAnyOfSchema;
import dev.langchain4j.model.chat.request.json.JsonArraySchema;
import dev.langchain4j.model.chat.request.json.JsonBooleanSchema;
import dev.langchain4j.model.chat.request.json.JsonEnumSchema;
import dev.langchain4j.model.chat.request.json.JsonIntegerSchema;
import dev.langchain4j.model.chat.request.json.JsonNullSchema;
import dev.langchain4j.model.chat.request.json.JsonObjectSchema;
import dev.langchain4j.model.chat.request.json.JsonSchema;
import dev.langchain4j.model.chat.request.json.JsonSchemaElement;
import dev.langchain4j.model.chat.request.json.JsonStringSchema;
import dev.langchain4j.model.chat.response.ChatResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import se.formout.backend.form.schema.Field;
import se.formout.backend.form.schema.FieldSettings;
import se.formout.backend.form.schema.FormSchema;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

/**
 * Sends an uploaded form image or PDF to OpenAI's Responses API (via
 * LangChain4j's {@link ChatModel} abstraction) and turns the structured JSON
 * it returns into a real {@link FormSchema}. The model is not asked for
 * field ids -- it has no meaningful way to choose good ones, so fresh ids
 * are generated here after parsing.
 */
@Service
public class OpenAiFormInterpreter {

    private static final String PROMPT = """
            You are extracting the structure of a paper form from an image or PDF into a \
            structured JSON representation. First write a short internal title and an \
            optional short internal description for the form -- these are only used to \
            identify the form later in an admin list and are never shown to the person \
            filling in the form. Then list the form's fields, in the order they appear on \
            the form, top to bottom.

            Because the title and description are internal-only, any heading, title, or \
            introductory text that is visibly printed on the form itself -- text someone \
            filling in the form would actually read -- must ALSO be captured as its own \
            HEADING, SUBHEADING, or PARAGRAPH field at the right position in the fields \
            list. Do not rely on the internal title/description alone to carry that text: \
            if it only lives there, it will never be shown to whoever fills in the form.

            Each field has:
            - type: TEXT (short single-line answer), TEXTAREA (longer multi-line answer), \
            NUMBER (numeric answer), CHECKBOX (a single yes/no checkbox), SINGLE_CHOICE \
            (choose exactly one option), MULTIPLE_CHOICE (choose one or more options), SCALE \
            (a numeric rating scale), DATE (a date-only answer, e.g. a field labelled "Date" \
            or "Born" with a blank to write a date on), TIME (a time-only answer), DATETIME \
            (an answer that is both a date and a time), HEADING or SUBHEADING (a heading-like \
            line of text that is not itself a question), PARAGRAPH (explanatory text that is \
            not a question), DIVIDER (a plain dividing line that should be used to separate \
            sections or groups of questions).
            - label: the question text, or the heading/paragraph text. Leave empty for DIVIDER.
            - required: whether the form marks the field as mandatory.
            - settings: for SINGLE_CHOICE/MULTIPLE_CHOICE, the list of options; for SCALE, \
            min, max, and optional labels for the two endpoints; otherwise leave every \
            settings field null.

            Preserve the original language of the form's text. Do not invent content that is \
            not present in the form, and do not invent headings or group fields under a \
            heading that isn't actually printed on the form.""";

    private static final String CONTEXT_PREFIX = """
            This form has multiple pages. The image below is the NEXT page, not the first. \
            The following JSON array lists the fields already captured from the PREVIOUS \
            page(s) of this same form, for context only -- do not repeat any of them in your \
            answer. Only extract fields for content that is newly visible on the page shown \
            below. If a heading, title, or instructional text is repeated on every page (e.g. \
            a running header), do not add it again. If the form's structure repeats (e.g. the \
            same block of questions appears once per page), continue that same pattern for \
            the new page.

            Previously captured fields (context only, do not repeat):
            """;

    private final ChatModel chatModel;
    private final ObjectMapper objectMapper;
    private final String apiKey;

    public OpenAiFormInterpreter(ChatModel chatModel, ObjectMapper objectMapper, @Value("${app.openai.api-key}") String apiKey) {
        this.chatModel = chatModel;
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
    }

    public FormSchema interpret(MultipartFile file) {
        return interpret(file, null);
    }

    /**
     * Interprets a single page of a form. {@code previousFieldsJson}, when
     * given, is the JSON array of fields already captured from earlier pages
     * of this same multi-page form -- it is included in the prompt purely as
     * context for the model to read (so it can avoid repeating a heading
     * that appears on every page, and follow an established pattern such as
     * a repeated question block). The response is still only ever used to
     * produce the fields found on THIS page: the caller is responsible for
     * appending them, never replacing what earlier pages already produced.
     */
    public FormSchema interpret(MultipartFile file, String previousFieldsJson) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("OPENAI_API_KEY is not configured");
        }

        String promptText = previousFieldsJson != null && !previousFieldsJson.isBlank()
                ? PROMPT + "\n\n" + CONTEXT_PREFIX + previousFieldsJson
                : PROMPT;

        UserMessage userMessage = UserMessage.from(buildFileContent(file), TextContent.from(promptText));
        ChatRequest request = ChatRequest.builder()
                .messages(userMessage)
                .responseFormat(buildResponseFormat())
                .build();

        ChatResponse response = chatModel.chat(request);
        String outputText = response.aiMessage().text();

        AiInterpretedForm interpreted = objectMapper.readValue(outputText, AiInterpretedForm.class);
        return toFormSchema(interpreted);
    }

    private Content buildFileContent(MultipartFile file) {
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new IllegalStateException("Failed to read uploaded file", e);
        }
        String base64 = Base64.getEncoder().encodeToString(bytes);

        if ("application/pdf".equals(file.getContentType())) {
            return PdfFileContent.from(base64, "application/pdf");
        }

        String mimeType = file.getContentType() != null ? file.getContentType() : "image/jpeg";
        return ImageContent.from(base64, mimeType, ImageContent.DetailLevel.AUTO);
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

    private static ResponseFormat buildResponseFormat() {
        return ResponseFormat.builder()
                .type(ResponseFormatType.JSON)
                .jsonSchema(JsonSchema.builder()
                        .name("form_schema")
                        .rootElement(buildResponseSchema())
                        .build())
                .build();
    }

    private static JsonObjectSchema buildResponseSchema() {
        JsonObjectSchema settingsSchema = JsonObjectSchema.builder()
                .addProperty("min", nullable(new JsonIntegerSchema()))
                .addProperty("max", nullable(new JsonIntegerSchema()))
                .addProperty("minLabel", nullable(new JsonStringSchema()))
                .addProperty("maxLabel", nullable(new JsonStringSchema()))
                .addProperty("options", nullable(JsonArraySchema.builder().items(new JsonStringSchema()).build()))
                .required("min", "max", "minLabel", "maxLabel", "options")
                .additionalProperties(false)
                .build();

        JsonObjectSchema fieldSchema = JsonObjectSchema.builder()
                .addProperty("type", JsonEnumSchema.builder()
                        .enumValues(List.of(
                                "TEXT", "TEXTAREA", "NUMBER", "CHECKBOX", "SINGLE_CHOICE",
                                "MULTIPLE_CHOICE", "SCALE", "DATE", "TIME", "DATETIME",
                                "HEADING", "SUBHEADING", "PARAGRAPH", "DIVIDER"
                        ))
                        .build())
                .addProperty("label", nullable(new JsonStringSchema()))
                .addProperty("required", new JsonBooleanSchema())
                .addProperty("settings", settingsSchema)
                .required("type", "label", "required", "settings")
                .additionalProperties(false)
                .build();

        return JsonObjectSchema.builder()
                .addProperty("title", new JsonStringSchema())
                .addProperty("description", nullable(new JsonStringSchema()))
                .addProperty("fields", JsonArraySchema.builder().items(fieldSchema).build())
                .required("title", "description", "fields")
                .additionalProperties(false)
                .build();
    }

    private static JsonSchemaElement nullable(JsonSchemaElement element) {
        return JsonAnyOfSchema.builder().anyOf(element, new JsonNullSchema()).build();
    }
}
