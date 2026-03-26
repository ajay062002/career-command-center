package com.ajay.career.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "rtrs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RTR {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = true)
    private Job job;
}
