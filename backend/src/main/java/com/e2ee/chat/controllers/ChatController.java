package com.e2ee.chat.controllers;

import com.e2ee.chat.models.ChatMessage;
import com.e2ee.chat.repository.ChatMessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class ChatController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @MessageMapping("/chat.sendPrivateMessage")
    public void sendPrivateMessage(@Payload ChatMessage chatMessage) {
        // [TACTICAL_DATA_LINK] - Save to Cloud Atlas for Persistence
        System.out.println("LOG: ROUTING PAYLOAD FROM [" + chatMessage.getSenderId() + "] TO [" + chatMessage.getReceiverId() + "]...");
        
        chatMessageRepository.save(chatMessage);
        
        messagingTemplate.convertAndSendToUser(
                chatMessage.getReceiverId(), "/queue/messages", chatMessage);
    }
}
