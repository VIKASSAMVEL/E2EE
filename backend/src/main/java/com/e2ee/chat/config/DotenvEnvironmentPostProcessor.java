package com.e2ee.chat.config;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.util.HashMap;
import java.util.Map;

public class DotenvEnvironmentPostProcessor implements EnvironmentPostProcessor {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        Dotenv dotenv = Dotenv.configure()
                .ignoreIfMissing()
                .filename(".env")
                .load();

        String mongodbUri = dotenv.get("MONGODB_URI");
        if (mongodbUri == null || mongodbUri.isBlank()) {
            mongodbUri = environment.getProperty("MONGODB_URI");
        }

        if (mongodbUri == null || mongodbUri.isBlank()) {
            throw new IllegalStateException("MONGODB_URI is not set in .env or environment. Please set MONGODB_URI and restart.");
        }

        Map<String, Object> propertyMap = new HashMap<>();
        propertyMap.put("MONGODB_URI", mongodbUri);
        propertyMap.put("spring.data.mongodb.uri", mongodbUri);

        environment.getPropertySources().addFirst(new MapPropertySource("dotenv", propertyMap));

        System.setProperty("MONGODB_URI", mongodbUri);
    }
}
