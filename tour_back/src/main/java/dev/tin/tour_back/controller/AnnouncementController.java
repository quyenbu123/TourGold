package dev.tin.tour_back.controller;

import dev.tin.tour_back.dto.AnnouncementMessage;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class AnnouncementController {

    private final SimpMessagingTemplate messagingTemplate;

    public AnnouncementController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    // Client sends to /app/announce; server broadcasts to /topic/announcements
    @MessageMapping("/announce")
    @SendTo("/topic/announcements")
    public AnnouncementMessage announce(AnnouncementMessage message) {
        if (message == null || message.getContent() == null) {
            return new AnnouncementMessage("");
        }
        return new AnnouncementMessage(message.getContent().trim());
    }

    // Helper method for REST-triggered broadcasts if needed later
    public void broadcast(String content) {
        messagingTemplate.convertAndSend("/topic/announcements", new AnnouncementMessage(content));
    }
}
