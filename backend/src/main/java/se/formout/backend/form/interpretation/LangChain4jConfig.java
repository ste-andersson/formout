package se.formout.backend.form.interpretation;

import dev.langchain4j.http.client.jdk.JdkHttpClientBuilder;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.listener.ChatModelListener;
import dev.langchain4j.model.openai.OpenAiResponsesChatModel;
import dev.langchain4j.observation.listener.ObservationChatModelListener;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.observation.ObservationPredicate;
import io.micrometer.observation.ObservationRegistry;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.util.List;

/**
 * Builds the {@link ChatModel} used for form interpretation: OpenAI's
 * Responses API (needed for reasoning-effort control and strict structured
 * outputs) via LangChain4j. Connect/read timeouts match the previous
 * direct-HTTP implementation -- vision + structured-output interpretation
 * can legitimately take up to a minute, and without an explicit timeout the
 * call could hang indefinitely, stalling the frontend's "tolkar formuläret"
 * loading modal.
 *
 * <p>The model is also wired with a {@link ChatModelListener} that reports
 * each call as a Micrometer observation, which Spring's OpenTelemetry
 * tracing bridge turns into a trace exported to Langfuse (see
 * {@code management.opentelemetry.tracing.export.otlp.*} in
 * application.properties). This is purely additive: if the exporter can't
 * reach Langfuse, the interpretation call itself must still succeed --
 * tracing is not allowed to become a new way for this flow to break.
 */
@Configuration
public class LangChain4jConfig {

    /**
     * spring-boot-starter-opentelemetry auto-instruments the whole app (every
     * HTTP request, every Spring Security filter-chain decision), not just AI
     * calls -- without this, Langfuse fills up with unrelated web/security
     * traces instead of just the form-interpretation calls it's meant to
     * observe. LangChain4j's chat-model observation is named
     * "gen_ai.client.operation.duration"; everything else is dropped before
     * it's even recorded.
     */
    @Bean
    public ObservationPredicate onlyChatModelObservations() {
        return (name, context) -> "gen_ai.client.operation.duration".equals(name);
    }

    @Bean
    public LangfuseContentChatModelListener langfuseContentChatModelListener() {
        return new LangfuseContentChatModelListener();
    }

    @Bean
    public ObservationChatModelListener observationChatModelListener(
            ObservationRegistry observationRegistry, MeterRegistry meterRegistry) {
        return new ObservationChatModelListener(observationRegistry, meterRegistry);
    }

    @Bean
    public ChatModel formInterpretationChatModel(
            @Value("${app.openai.api-key}") String apiKey,
            @Value("${app.openai.model}") String model,
            LangfuseContentChatModelListener langfuseContentChatModelListener,
            ObservationChatModelListener observationChatModelListener) {
        return OpenAiResponsesChatModel.builder()
                .apiKey(apiKey)
                .modelName(model)
                .reasoningEffort("low")
                .strictJsonSchema(true)
                // langfuseContentChatModelListener must run first: LangChain4j
                // invokes listeners in list order for both onRequest and
                // onResponse, and ObservationChatModelListener.onResponse
                // removes the observation scope and stops the observation --
                // so the content listener has to read it before that happens.
                .listeners(List.of(langfuseContentChatModelListener, observationChatModelListener))
                .httpClientBuilder(new JdkHttpClientBuilder()
                        .connectTimeout(Duration.ofSeconds(10))
                        .readTimeout(Duration.ofSeconds(90)))
                .build();
    }
}
