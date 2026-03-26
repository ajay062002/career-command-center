package com.ajay.career.service.impl;

import com.ajay.career.dto.StudySessionDTO;
import com.ajay.career.entity.StudySession;
import com.ajay.career.mapper.StudySessionMapper;
import com.ajay.career.repository.StudySessionRepository;
import com.ajay.career.service.StudySessionService;
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
public class StudySessionServiceImpl implements StudySessionService {

    private final StudySessionRepository studySessionRepository;
    private final StudySessionMapper studySessionMapper;

    @Override
    public StudySessionDTO createSession(StudySessionDTO dto) {
        StudySession studySession = studySessionMapper.toEntity(dto);
        studySession.setId(null);
        return studySessionMapper.toDTO(studySessionRepository.save(studySession));
    }

    @Override
    public StudySessionDTO updateSession(UUID id, StudySessionDTO dto) {
        StudySession existing = studySessionRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new RuntimeException("Study Session not found with id: " + id));

        existing.setTopic(dto.getTopic());
        existing.setTimeSpentMinutes(dto.getTimeSpentMinutes());
        existing.setDate(dto.getDate());
        existing.setSource(dto.getSource());
        existing.setNotes(dto.getNotes());

        return studySessionMapper.toDTO(studySessionRepository.save(existing));
    }

    @Override
    @Transactional(readOnly = true)
    public StudySessionDTO getSessionById(UUID id) {
        return studySessionRepository.findById(Objects.requireNonNull(id))
                .map(studySessionMapper::toDTO)
                .orElseThrow(() -> new RuntimeException("Study Session not found with id: " + id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<StudySessionDTO> getAllSessions() {
        return studySessionRepository.findAll().stream()
                .map(studySessionMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<StudySessionDTO> getSessionsBetween(LocalDate start, LocalDate end) {
        return studySessionRepository.findByDateBetween(start, end).stream()
                .map(studySessionMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Integer getTotalMinutesBetween(LocalDate start, LocalDate end) {
        return studySessionRepository.findByDateBetween(start, end).stream()
                .map(StudySession::getTimeSpentMinutes)
                .filter(minutes -> minutes != null)
                .mapToInt(Integer::intValue)
                .sum();
    }
}
