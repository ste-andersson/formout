package se.formout.backend.form.interpretation;

import dev.langchain4j.http.client.jdk.JdkHttpClientBuilder;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.openai.OpenAiResponsesChatModel;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/**
 * Builds the {@link ChatModel} used for form interpretation: OpenAI's
 * Responses API (needed for reasoning-effort control and strict structured
 * outputs) via LangChain4j. Connect/read timeouts match the previous
 * direct-HTTP implementation -- vision + structured-output interpretation
 * can legitimately take up to a minute, and without an explicit timeout the
 * call could hang indefinitely, stalling the frontend's "tolkar formuläret"
 * loading modal.
 */
@Configuration
public class LangChain4jConfig {

    @Bean
    public ChatModel formInterpretationChatModel(
            @Value("${app.openai.api-key}") String apiKey,
            @Value("${app.openai.model}") String model) {
        return OpenAiResponsesChatModel.builder()
                .apiKey(apiKey)
                .modelName(model)
                .reasoningEffort("low")
                .strictJsonSchema(true)
                .httpClientBuilder(new JdkHttpClientBuilder()
                        .connectTimeout(Duration.ofSeconds(10))
                        .readTimeout(Duration.ofSeconds(90)))
                .build();
    }
}
