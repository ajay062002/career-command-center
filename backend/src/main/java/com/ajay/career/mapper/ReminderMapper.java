package com.ajay.career.mapper;

import com.ajay.career.dto.ReminderDTO;
import com.ajay.career.entity.Job;
import com.ajay.career.entity.Reminder;
import org.springframework.stereotype.Component;

@Component
public class ReminderMapper {

    public ReminderDTO toDTO(Reminder reminder) {
        if (reminder == null)
            return null;
        return ReminderDTO.builder()
                .id(reminder.getId())
                .jobId(reminder.getJob() != null ? reminder.getJob().getId() : null)
                .type(reminder.getType())
                .title(reminder.getTitle())
                .dueDate(reminder.getDueDate())
                .completed(reminder.getCompleted())
                .notes(reminder.getNotes())
                .build();
    }

    public Reminder toEntity(ReminderDTO dto, Job job) {
        if (dto == null)
            return null;
        return Reminder.builder()
                .id(dto.getId())
                .job(job)
                .type(dto.getType())
                .title(dto.getTitle())
                .dueDate(dto.getDueDate())
                .completed(dto.getCompleted())
                .notes(dto.getNotes())
                .build();
    }
}
