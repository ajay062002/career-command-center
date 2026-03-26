package com.ajay.career.repository;

import com.ajay.career.entity.StudySession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface StudySessionRepository extends JpaRepository<StudySession, UUID> {

    List<StudySession> findByDateBetween(LocalDate start, LocalDate end);

    List<StudySession> findByTopicContainingIgnoreCase(String topic);
}
