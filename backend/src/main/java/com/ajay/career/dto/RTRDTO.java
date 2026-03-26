package com.ajay.career.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RTRDTO {
    private UUID id;
    private UUID jobId;
    private LocalDate date;
    private String vendorName;
    private String vendorCompany;
    private String clientName;
    private String vendorPhone;
    private String vendorEmail;
    private BigDecimal rate;
    private String role;
    private String location;
    private String status;
}
