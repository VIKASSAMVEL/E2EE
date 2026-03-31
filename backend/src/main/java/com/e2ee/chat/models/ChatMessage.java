package com.e2ee.chat.models;

import lombok.Data;

@Data
public class ChatMessage {
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
