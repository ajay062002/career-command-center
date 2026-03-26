package com.ajay.career.controller;

import com.ajay.career.dto.StudySessionDTO;
import com.ajay.career.service.StudySessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.RequestMethod;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/study")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200", methods = { RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT,
        RequestMethod.DELETE, RequestMethod.OPTIONS })
public class StudySessionController {

    private final StudySessionService studySessionService;

    @PostMapping
    public ResponseEntity<StudySessionDTO> createSession(@RequestBody StudySessionDTO dto) {
        return new ResponseEntity<>(studySessionService.createSession(dto), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<StudySessionDTO> updateSession(@PathVariable("id") UUID id,
            @RequestBody StudySessionDTO dto) {
        return ResponseEntity.ok(studySessionService.updateSession(id, dto));
    }

    @GetMapping("/{id}")
    public ResponseEntity<StudySessionDTO> getSessionById(@PathVariable("id") UUID id) {
        return ResponseEntity.ok(studySessionService.getSessionById(id));
    }

    @GetMapping
    public ResponseEntity<List<StudySessionDTO>> getSessions(
            @RequestParam(name = "start", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam(name = "end", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        if (start != null && end != null) {
            return ResponseEntity.ok(studySessionService.getSessionsBetween(start, end));
        }
        return ResponseEntity.ok(studySessionService.getAllSessions());
    }

    @GetMapping("/total")
    public ResponseEntity<Integer> getTotalMinutes(
            @RequestParam(name = "start") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam(name = "end") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        return ResponseEntity.ok(studySessionService.getTotalMinutesBetween(start, end));
    }
}
