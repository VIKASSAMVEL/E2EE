package com.e2ee.chat.models;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.Instant;

@Data
@Document(collection = "users")
public class User {
    
    @Id
    private String id;

    @Indexed(unique = true)
    private String username;

    private String passwordHash;

    // The user's RSA public key (PEM encoded)
    private String publicKey;

    private Instant createdAt = Instant.now();
}
