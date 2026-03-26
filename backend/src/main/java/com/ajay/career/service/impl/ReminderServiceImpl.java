package com.ajay.career.service.impl;

import com.ajay.career.dto.ReminderDTO;
import com.ajay.career.entity.Job;
import com.ajay.career.entity.Reminder;
import com.ajay.career.mapper.ReminderMapper;
import com.ajay.career.repository.JobRepository;
import com.ajay.career.repository.ReminderRepository;
import com.ajay.career.service.ReminderService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ReminderServiceImpl implements ReminderService {

    private final ReminderRepository reminderRepository;
    private final JobRepository jobRepository;
    private final ReminderMapper reminderMapper;

    @Override
    public ReminderDTO createReminder(UUID jobId, ReminderDTO dto) {
        Job job = null;
        if (jobId != null) {
            job = jobRepository.findById(jobId)
                    .orElseThrow(() -> new RuntimeException("Job not found"));
        }
        Reminder reminder = reminderMapper.toEntity(dto, job);
        reminder.setId(null);
        return reminderMapper.toDTO(reminderRepository.save(reminder));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReminderDTO> getOverdueReminders() {
        return reminderRepository.findByDueDateBefore(LocalDate.now()).stream()
                .filter(reminder -> Boolean.FALSE.equals(reminder.getCompleted()))
                .map(reminderMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReminderDTO> getAllReminders() {
        return reminderRepository.findAll().stream()
                .map(reminderMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public ReminderDTO markComplete(UUID id) {
        Reminder reminder = reminderRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new RuntimeException("Reminder not found"));
        reminder.setCompleted(true);
        return reminderMapper.toDTO(reminderRepository.save(reminder));
    }
}
