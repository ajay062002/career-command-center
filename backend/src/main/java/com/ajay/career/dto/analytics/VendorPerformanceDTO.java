package com.ajay.career.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VendorPerformanceDTO {
    private String vendorCompany;
    private long totalSubmissions;
    private long totalRtrs;
    private long interviewsOrOffers;
}
