package com.e2ee.chat.config;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.MongoDatabaseFactory;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.SimpleMongoClientDatabaseFactory;

@Configuration
public class MongoConfig {

    @Value("${spring.data.mongodb.uri}")
    private String mongoUri;

    @Bean
    public MongoClient mongoClient() {
        System.out.println("LOG: Initializing Tactical MongoClient via MongoConfig Override...");
        System.out.println("LOG: Targeting Uplink: " + mongoUri.substring(0, 20) + "...");
        return MongoClients.create(mongoUri);
    }

    @Bean
    public MongoDatabaseFactory mongoDbFactory() {
        return new SimpleMongoClientDatabaseFactory(mongoClient(), "e2eechat");
    }

    @Bean
    public MongoTemplate mongoTemplate() {
        return new MongoTemplate(mongoDbFactory());
    }
}
