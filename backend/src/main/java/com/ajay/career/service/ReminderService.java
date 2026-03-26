package com.ajay.career.service;

import com.ajay.career.dto.ReminderDTO;

import java.util.List;
import java.util.UUID;

public interface ReminderService {
    ReminderDTO createReminder(UUID jobId, ReminderDTO dto);

    List<ReminderDTO> getOverdueReminders();

    List<ReminderDTO> getAllReminders();

    ReminderDTO markComplete(UUID id);
}
