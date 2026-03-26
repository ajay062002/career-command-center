package com.ajay.career.service;

import com.ajay.career.dto.StudySessionDTO;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface StudySessionService {
    StudySessionDTO createSession(StudySessionDTO dto);

    StudySessionDTO updateSession(UUID id, StudySessionDTO dto);

    StudySessionDTO getSessionById(UUID id);

    List<StudySessionDTO> getAllSessions();

    List<StudySessionDTO> getSessionsBetween(LocalDate start, LocalDate end);

    Integer getTotalMinutesBetween(LocalDate start, LocalDate end);
}
