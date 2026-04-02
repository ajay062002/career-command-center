package com.ajay.career.controller;

import com.ajay.career.dto.RTRDTO;
import com.ajay.career.service.RTRService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/rtrs")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class RTRController {

    private final RTRService rtrService;

    @GetMapping
    public ResponseEntity<List<RTRDTO>> getAllRTRs() {
        return ResponseEntity.ok(rtrService.getAllRTRs());
    }

    @PostMapping
    public ResponseEntity<RTRDTO> createRTR(@RequestBody RTRDTO dto) {
        return new ResponseEntity<>(rtrService.createRTR(dto), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<RTRDTO> updateRTR(@PathVariable("id") UUID id, @RequestBody RTRDTO dto) {
        return ResponseEntity.ok(rtrService.updateRTR(id, dto));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<RTRDTO> patchRTR(@PathVariable("id") UUID id, @RequestBody RTRDTO dto) {
        return ResponseEntity.ok(rtrService.updateRTR(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRTR(@PathVariable("id") UUID id) {
        rtrService.deleteRTR(id);
        return ResponseEntity.noContent().build();
    }
}
