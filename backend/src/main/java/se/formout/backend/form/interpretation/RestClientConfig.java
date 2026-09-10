package se.formout.backend.form.interpretation;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;

@Configuration
public class RestClientConfig {

    /**
     * Without an explicit timeout, the underlying JDK HttpClient has no read
     * timeout at all -- a stalled or unusually slow OpenAI response hangs the
     * request (and the frontend's "tolkar formuläret" modal) indefinitely,
     * with no error ever surfacing. Vision + structured-output interpretation
     * of a real form can legitimately take up to a minute or so, so the read
     * timeout is generous, but bounded.
     */
    @Bean
    public RestClient.Builder restClientBuilder() {
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();

        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(Duration.ofSeconds(90));

        return RestClient.builder().requestFactory(requestFactory);
    }
}
