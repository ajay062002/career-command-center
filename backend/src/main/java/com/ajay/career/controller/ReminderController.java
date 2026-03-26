package com.ajay.career.controller;

import com.ajay.career.dto.ReminderDTO;
import com.ajay.career.service.ReminderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/reminders")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class ReminderController {

    private final ReminderService reminderService;

    @PostMapping("/{jobId}")
    public ResponseEntity<ReminderDTO> createReminder(@PathVariable("jobId") UUID jobId, @RequestBody ReminderDTO dto) {
        return new ResponseEntity<>(reminderService.createReminder(jobId, dto), HttpStatus.CREATED);
    }

    @PostMapping
    public ResponseEntity<ReminderDTO> createGeneralReminder(@RequestBody ReminderDTO dto) {
        return new ResponseEntity<>(reminderService.createReminder(null, dto), HttpStatus.CREATED);
    }

    @GetMapping("/overdue")
    public ResponseEntity<List<ReminderDTO>> getOverdueReminders() {
        return ResponseEntity.ok(reminderService.getOverdueReminders());
    }

    @GetMapping
    public ResponseEntity<List<ReminderDTO>> getAllReminders() {
        return ResponseEntity.ok(reminderService.getAllReminders());
    }

    @PutMapping("/{id}/complete")
    public ResponseEntity<ReminderDTO> markComplete(@PathVariable("id") UUID id) {
        return ResponseEntity.ok(reminderService.markComplete(id));
    }
}
