package se.formout.backend.form.interpretation;

import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.data.message.Content;
import dev.langchain4j.data.message.TextContent;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.listener.ChatModelErrorContext;
import dev.langchain4j.model.chat.listener.ChatModelListener;
import dev.langchain4j.model.chat.listener.ChatModelRequestContext;
import dev.langchain4j.model.chat.listener.ChatModelResponseContext;
import io.micrometer.observation.Observation;

import java.util.Map;

/**
 * Adds the prompt text and the model's response as attributes on the same
 * Micrometer observation {@link ObservationChatModelListener} creates, so
 * Langfuse shows them in its Input/Output columns instead of leaving every
 * trace blank -- {@code langchain4j-observation} only reports numeric/model
 * metadata (latency, token counts, model name) by itself, not content.
 *
 * <p>Only the text parts of the prompt are captured -- the uploaded form
 * image/PDF itself (the multimodal {@link Content} parts) is deliberately
 * left out, so the base64-encoded file never ends up bloating a trace.
 *
 * <p>Must be registered <em>before</em> {@link ObservationChatModelListener}
 * in {@code .listeners(...)}: LangChain4j calls listener callbacks in list
 * order for both {@code onRequest} and {@code onResponse}, and
 * {@code ObservationChatModelListener.onResponse} removes the observation
 * scope from the shared attributes map and stops the observation -- this
 * listener has to read it first.
 */
class LangfuseContentChatModelListener implements ChatModelListener {

    private static final String OBSERVATION_SCOPE_KEY = "micrometer.observation.scope";
    private static final String PROMPT_ATTRIBUTE_KEY = "formout.prompt";

    @Override
    public void onRequest(ChatModelRequestContext requestContext) {
        requestContext.attributes().put(PROMPT_ATTRIBUTE_KEY, promptText(requestContext.chatRequest().messages()));
    }

    @Override
    public void onResponse(ChatModelResponseContext responseContext) {
        enrich(responseContext.attributes(), responseContext.chatResponse().aiMessage().text());
    }

    @Override
    public void onError(ChatModelErrorContext errorContext) {
        String message = errorContext.error() != null ? errorContext.error().getMessage() : "unknown error";
        enrich(errorContext.attributes(), "ERROR: " + message);
    }

    private void enrich(Map<Object, Object> attributes, String output) {
        Object scopeObject = attributes.get(OBSERVATION_SCOPE_KEY);
        if (!(scopeObject instanceof Observation.Scope scope)) {
            return;
        }
        Observation observation = scope.getCurrentObservation();
        if (observation == null) {
            return;
        }
        Object prompt = attributes.get(PROMPT_ATTRIBUTE_KEY);
        observation.highCardinalityKeyValue("langfuse.observation.input", String.valueOf(prompt));
        observation.highCardinalityKeyValue("langfuse.observation.output", output);
    }

    private static String promptText(java.util.List<ChatMessage> messages) {
        StringBuilder text = new StringBuilder();
        for (ChatMessage message : messages) {
            if (message instanceof UserMessage userMessage) {
                for (Content content : userMessage.contents()) {
                    if (content instanceof TextContent textContent) {
                        text.append(textContent.text()).append('\n');
                    }
                }
            }
        }
        return text.toString();
    }
}
