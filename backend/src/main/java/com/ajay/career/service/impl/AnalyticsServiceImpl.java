package com.ajay.career.service.impl;

import com.ajay.career.dto.analytics.*;
import com.ajay.career.entity.JobStatus;
import com.ajay.career.repository.*;
import com.ajay.career.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AnalyticsServiceImpl implements AnalyticsService {

    private final JobRepository jobRepository;
    private final SubmissionRepository submissionRepository;
    private final RTRRepository rtrRepository;
    private final StudySessionRepository studySessionRepository;
    private final ReminderRepository reminderRepository;
    private final UserRepository userRepository;

    @Override
    public DashboardSummaryDTO getDashboardSummary() {
        LocalDate now = LocalDate.now();
        LocalDate sevenDaysAgo = now.minusDays(7);

        // Run all independent count queries in parallel
        CompletableFuture<Long> totalJobs = CompletableFuture.supplyAsync(() -> jobRepository.count());
        CompletableFuture<Long> activeSubs = CompletableFuture.supplyAsync(() -> submissionRepository.count());
        CompletableFuture<Long> rtrPending = CompletableFuture.supplyAsync(() -> rtrRepository.countByStatusNot("Rejected"));
        CompletableFuture<Long> offers = CompletableFuture.supplyAsync(() -> jobRepository.countByStatus(JobStatus.OFFER));
        CompletableFuture<Long> rejected = CompletableFuture.supplyAsync(() -> jobRepository.countByStatus(JobStatus.REJECTED));
        CompletableFuture<Long> overdueReminders = CompletableFuture.supplyAsync(() -> reminderRepository.countByDueDateBeforeAndCompletedFalse(now));
        CompletableFuture<Long> totalUsers = CompletableFuture.supplyAsync(() -> userRepository.count());
        CompletableFuture<Integer> studyMinutes = CompletableFuture.supplyAsync(() -> {
            Map<LocalDate, Integer> minutesByDate = studySessionRepository.sumMinutesByDateBetween(sevenDaysAgo, now).stream()
                    .collect(Collectors.toMap(
                            row -> (LocalDate) row[0],
                            row -> ((Number) row[1]).intValue()
                    ));
            return minutesByDate.values().stream().mapToInt(Integer::intValue).sum();
        });

        CompletableFuture.allOf(totalJobs, activeSubs, rtrPending, offers, rejected, overdueReminders, totalUsers, studyMinutes).join();

        return DashboardSummaryDTO.builder()
                .totalJobs(totalJobs.join())
                .activeSubmissions(activeSubs.join())
                .rtrPending(rtrPending.join())
                .offers(offers.join())
                .rejected(rejected.join())
                .studyMinutesThisWeek(studyMinutes.join())
                .overdueReminders(overdueReminders.join())
                .totalUsers(totalUsers.join())
                .build();
    }

    @Override
    public List<JobsByStatusDTO> getJobsGroupedByStatus() {
        return jobRepository.countJobsByStatus().stream()
                .map(result -> {
                    JobStatus status;
                    Object statusObj = result[0];
                    if (statusObj instanceof JobStatus) {
                        status = (JobStatus) statusObj;
                    } else if (statusObj instanceof String) {
                        status = JobStatus.valueOf((String) statusObj);
                    } else {
                        status = JobStatus.valueOf(statusObj.toString());
                    }
                    return new JobsByStatusDTO(status, ((Number) result[1]).longValue());
                })
                .collect(Collectors.toList());
    }

    @Override
    public List<StudyTrendDTO> getStudyTrendLast7Days() {
        LocalDate now = LocalDate.now();
        LocalDate sevenDaysAgo = now.minusDays(6);

        Map<LocalDate, Integer> minutesByDate = studySessionRepository.sumMinutesByDateBetween(sevenDaysAgo, now).stream()
                .collect(Collectors.toMap(
                        row -> (LocalDate) row[0],
                        row -> ((Number) row[1]).intValue()
                ));

        List<StudyTrendDTO> trend = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            LocalDate date = sevenDaysAgo.plusDays(i);
            trend.add(new StudyTrendDTO(date, minutesByDate.getOrDefault(date, 0)));
        }
        return trend;
    }

    @Override
    public List<VendorPerformanceDTO> getVendorPerformance() {
        Map<String, VendorPerformanceDTO> performanceMap = submissionRepository.getVendorPerformanceMetrics().stream()
                .collect(Collectors.toMap(
                        result -> result[0] != null ? result[0].toString() : "Unknown",
                        result -> VendorPerformanceDTO.builder()
                                .vendorCompany(result[0] != null ? result[0].toString() : "Unknown")
                                .totalSubmissions(((Number) result[1]).longValue())
                                .interviewsOrOffers(((Number) result[2]).longValue())
                                .totalRtrs(0L)
                                .build(),
                        (existing, replacement) -> {
                            existing.setTotalSubmissions(
                                    existing.getTotalSubmissions() + replacement.getTotalSubmissions());
                            existing.setInterviewsOrOffers(
                                    existing.getInterviewsOrOffers() + replacement.getInterviewsOrOffers());
                            return existing;
                        }));

        rtrRepository.getVendorRtrCounts().forEach(result -> {
            String vendor = result[0] != null ? result[0].toString() : "Unknown";
            long count = ((Number) result[1]).longValue();

            if (performanceMap.containsKey(vendor)) {
                performanceMap.get(vendor).setTotalRtrs(count);
            } else {
                performanceMap.put(vendor, VendorPerformanceDTO.builder()
                        .vendorCompany(vendor)
                        .totalRtrs(count)
                        .totalSubmissions(0L)
                        .interviewsOrOffers(0L)
                        .build());
            }
        });

        return new ArrayList<>(performanceMap.values());
    }
}
