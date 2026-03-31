package com.e2ee.chat.config;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DotenvConfig {

    public static void loadEnv() {
        Dotenv dotenv = Dotenv.configure()
                .ignoreIfMissing()
                .filename(".env")
                .load();

        String mongodbUri = dotenv.get("MONGODB_URI");
        if (mongodbUri == null || mongodbUri.isBlank()) {
            throw new IllegalStateException("MONGODB_URI is not set in .env file. Please set MONGODB_URI and restart.");
        }

        // Spring property resolution uses system properties / environment variables.
        // Set system property so ${MONGODB_URI} can resolve in application.properties.
        System.setProperty("MONGODB_URI", mongodbUri);
    }
}
