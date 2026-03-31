package com.e2ee.chat.models;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.Data;

@Data
@Document(collection = "messages")
public class ChatMessage {
    @Id
    private String id;
    private String senderId;
    private String receiverId;
    private String encryptedPayload; // The AES-256 cipher text
    private String encryptedKey; // The AES key encrypted with receiver's RSA Public Key
    private String timestamp;
    
    // TACTICAL_DATA_LINK
    private boolean isAttachment;
    private String fileName;
    private String fileType;
}
