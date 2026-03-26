package com.ajay.career.controller;

import com.ajay.career.service.AutomationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/automation")
@CrossOrigin(origins = "*")
public class AutomationController {

    @Autowired
    private AutomationService automationService;

    @PostMapping("/generate-resume")
    public Map<String, String> generateResume(@RequestBody(required = false) Map<String, Object> content) {
        if (content == null || content.isEmpty()) {
            return Map.of("status", "error", "message", "Content is required");
        }
        return automationService.generateResume(content);
    }

    @GetMapping("/base-content")
    public Map<String, Object> getBaseContent() {
        return automationService.getBaseContent();
    }

    @GetMapping("/email-draft")
    public Map<String, String> getEmailDraft(
            @RequestParam String role,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String jd) {
        String draftUrl = automationService.getEmailDraft(role, email, jd);
        return Map.of("url", draftUrl);
    }

    @PostMapping("/parse-jd")
    public Map<String, String> parseJD(@RequestBody Map<String, String> payload) {
        return automationService.parseJD(payload.get("jdText"));
    }

    @GetMapping("/followup-draft")
    public Map<String, String> getFollowupDraft(
            @RequestParam String role,
            @RequestParam String email) {
        String draftUrl = automationService.getFollowUpDraft(email, role);
        return Map.of("url", draftUrl);
    }

    @GetMapping("/email-template/{type}")
    public Map<String, String> getEmailTemplate(@PathVariable String type) {
        return Map.of("content", automationService.getEmailTemplate(type));
    }

    @PostMapping("/email-template/{type}")
    public void saveEmailTemplate(@PathVariable String type, @RequestBody Map<String, String> payload) {
        automationService.saveEmailTemplate(type, payload.get("content"));
    }
}
