package com.e2ee.chat.controllers;

import com.e2ee.chat.models.User;
import com.e2ee.chat.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    UserRepository userRepository;

    @GetMapping("/search")
    public ResponseEntity<?> searchUsers() {
        List<Map<String, String>> users = userRepository.findAll().stream()
                .map(user -> {
                    Map<String, String> map = new HashMap<>();
                    map.put("id", user.getId());
                    map.put("username", user.getUsername());
                    map.put("publicKey", user.getPublicKey());
                    return map;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(users);
    }

    @GetMapping("/{username}/publicKey")
    public ResponseEntity<?> getPublicKey(@PathVariable String username) {
        Optional<User> userContent = userRepository.findByUsername(username);
        if (userContent.isPresent()) {
            return ResponseEntity.ok(userContent.get().getPublicKey());
        }
        return ResponseEntity.notFound().build();
    }
}
