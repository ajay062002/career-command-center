package com.ajay.career.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardSummaryDTO {
    private long totalJobs;
    private long activeSubmissions;
    private long rtrPending;
    private long offers;
    private long rejected;
    private int studyMinutesThisWeek;
    private long overdueReminders;
    private long totalUsers;
}
