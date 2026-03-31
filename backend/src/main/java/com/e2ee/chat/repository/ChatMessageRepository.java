package com.e2ee.chat.repository;

import com.e2ee.chat.models.ChatMessage;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface ChatMessageRepository extends MongoRepository<ChatMessage, String> {
    List<ChatMessage> findByReceiverId(String receiverId);
    List<ChatMessage> findBySenderIdAndReceiverIdOrSenderIdAndReceiverIdOrderByTimestampAsc(
            String s1, String r1, String s2, String r2);
}
