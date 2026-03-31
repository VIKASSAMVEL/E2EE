package com.e2ee.chat.controllers;

import com.e2ee.chat.models.ChatMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class ChatController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/chat.sendPrivateMessage")
    public void sendPrivateMessage(@Payload ChatMessage chatMessage) {
        // Zero-trust routing: Server cannot decrypt the payload nor the symmetric key.
        // It simply routes the payload directly to the receiver's private queue.
        messagingTemplate.convertAndSendToUser(
                chatMessage.getReceiverId(), "/queue/messages", chatMessage);
    }
}
