package com.ajay.career.dto;

import com.ajay.career.entity.JobStatus;
import com.ajay.career.entity.WorkMode;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobDTO {
    private UUID id;
    private String jobTitle;
    private String companyName;
    private String vendorCompany;
    private String vendorContactName;
    private String vendorContactEmail;
    private String location;
    private WorkMode workMode;
    private JobStatus status;
    private LocalDate appliedDate;
    private String notes;
}
