package com.ajay.career.controller;

import com.ajay.career.dto.analytics.DashboardSummaryDTO;
import com.ajay.career.dto.analytics.JobsByStatusDTO;
import com.ajay.career.dto.analytics.StudyTrendDTO;
import com.ajay.career.dto.analytics.VendorPerformanceDTO;
import com.ajay.career.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/dashboard")
    public ResponseEntity<DashboardSummaryDTO> getDashboardSummary() {
        return ResponseEntity.ok(analyticsService.getDashboardSummary());
    }

    @GetMapping("/jobs-by-status")
    public ResponseEntity<List<JobsByStatusDTO>> getJobsGroupedByStatus() {
        return ResponseEntity.ok(analyticsService.getJobsGroupedByStatus());
    }

    @GetMapping("/study-trend")
    public ResponseEntity<List<StudyTrendDTO>> getStudyTrend() {
        return ResponseEntity.ok(analyticsService.getStudyTrendLast7Days());
    }

    @GetMapping("/vendor-performance")
    public ResponseEntity<List<VendorPerformanceDTO>> getVendorPerformance() {
        return ResponseEntity.ok(analyticsService.getVendorPerformance());
    }
}
