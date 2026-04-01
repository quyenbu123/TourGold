package dev.tin.tour_back.controller;

import dev.tin.tour_back.dto.AiChatRequest;
import dev.tin.tour_back.dto.AiChatResponse;
import dev.tin.tour_back.service.AiChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/ai-chat")
@RequiredArgsConstructor
public class AiChatController {

    private final AiChatService aiChatService;

    @PostMapping("/ask")
    public ResponseEntity<AiChatResponse> ask(@RequestBody AiChatRequest req) {
        try {
            String answer = aiChatService.answer(req != null ? req.getQuestion() : null);
            return ResponseEntity.ok(new AiChatResponse(answer));
        } catch (Exception e) {
            return ResponseEntity.ok(new AiChatResponse("Xin lỗi, hiện tại hệ thống không thể trả lời. Vui lòng thử lại sau."));
        }
    }

    @GetMapping("/ping")
    public ResponseEntity<String> ping() {
        return ResponseEntity.ok("ai-chat-ok");
    }
}

