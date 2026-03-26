package com.ajay.career.dto;

import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudySessionDTO {
    private UUID id;
    private LocalDate date;
    private String topic;
    private Integer timeSpentMinutes;
    private String source;
    private String notes;
}
