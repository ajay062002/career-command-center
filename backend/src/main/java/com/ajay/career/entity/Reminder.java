package com.ajay.career.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "reminders", indexes = {
    @Index(name = "idx_reminder_job_id", columnList = "job_id"),
    @Index(name = "idx_reminder_due_completed", columnList = "dueDate, completed")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Reminder {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    private ReminderType type;

    @Column(nullable = false)
    private String title;

    private LocalDate dueDate;
    private Boolean completed;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id")
    private Job job;
}
