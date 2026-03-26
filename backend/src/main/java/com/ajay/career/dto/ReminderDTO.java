package com.ajay.career.dto;

import com.ajay.career.entity.ReminderType;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReminderDTO {
    private UUID id;
    private UUID jobId;
    private ReminderType type;
    private String title;
    private LocalDate dueDate;
    private Boolean completed;
    private String notes;
}
