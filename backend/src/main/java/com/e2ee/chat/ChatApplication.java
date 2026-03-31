package com.e2ee.chat;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import com.e2ee.chat.config.DotenvConfig;

@SpringBootApplication
public class ChatApplication {

	public static void main(String[] args) {
		DotenvConfig.loadEnv();
		SpringApplication.run(ChatApplication.class, args);
	}

}
