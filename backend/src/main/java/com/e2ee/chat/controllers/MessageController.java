package com.e2ee.chat.controllers;

import com.e2ee.chat.models.ChatMessage;
import com.e2ee.chat.repository.ChatMessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @GetMapping("/history/{otherUser}")
    public List<ChatMessage> getChatHistory(
            @PathVariable String otherUser,
            @RequestParam String currentUser) {
        // [TACTICAL_DATA_LINK] - Retrieve Mission History
        return chatMessageRepository.findBySenderIdAndReceiverIdOrSenderIdAndReceiverIdOrderByTimestampAsc(
                currentUser, otherUser, otherUser, currentUser);
    }
}
