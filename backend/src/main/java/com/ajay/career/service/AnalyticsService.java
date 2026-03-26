package com.ajay.career.service;

import com.ajay.career.dto.analytics.DashboardSummaryDTO;
import com.ajay.career.dto.analytics.JobsByStatusDTO;
import com.ajay.career.dto.analytics.StudyTrendDTO;
import com.ajay.career.dto.analytics.VendorPerformanceDTO;

import java.util.List;

public interface AnalyticsService {
    DashboardSummaryDTO getDashboardSummary();

    List<JobsByStatusDTO> getJobsGroupedByStatus();

    List<StudyTrendDTO> getStudyTrendLast7Days();

    List<VendorPerformanceDTO> getVendorPerformance();
}
