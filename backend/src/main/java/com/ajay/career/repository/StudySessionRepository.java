package com.ajay.career.repository;

import com.ajay.career.entity.StudySession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface StudySessionRepository extends JpaRepository<StudySession, UUID> {

    List<StudySession> findByDateBetween(LocalDate start, LocalDate end);

    List<StudySession> findByTopicContainingIgnoreCase(String topic);

    @Query("SELECT s.date, SUM(s.timeSpentMinutes) FROM StudySession s WHERE s.date BETWEEN :start AND :end GROUP BY s.date ORDER BY s.date")
    List<Object[]> sumMinutesByDateBetween(@Param("start") LocalDate start, @Param("end") LocalDate end);
}
