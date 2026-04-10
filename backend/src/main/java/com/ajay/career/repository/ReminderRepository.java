package com.ajay.career.repository;

import com.ajay.career.entity.Reminder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface ReminderRepository extends JpaRepository<Reminder, UUID> {

    List<Reminder> findByCompletedFalse();

    List<Reminder> findByDueDateBefore(LocalDate date);

    List<Reminder> findByDueDateBeforeAndCompletedFalse(LocalDate date);

    long countByDueDateBeforeAndCompletedFalse(LocalDate date);
}
