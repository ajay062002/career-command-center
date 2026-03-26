package com.ajay.career.dto;

import com.ajay.career.entity.SubmissionStatus;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubmissionDTO {
    private UUID id;
    private UUID jobId;
    private SubmissionStatus submissionStatus;
    private LocalDate submissionDate;
    private String submittedByVendor;
    private String vendorPhone;
    private String vendorEmail;
    private String rateSubmitted;
    private LocalDate followUpDate;
    private String notes;
}
