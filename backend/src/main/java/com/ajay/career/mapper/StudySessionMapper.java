package com.ajay.career.mapper;

import com.ajay.career.dto.StudySessionDTO;
import com.ajay.career.entity.StudySession;
import org.springframework.stereotype.Component;

@Component
public class StudySessionMapper {

    public StudySessionDTO toDTO(StudySession studySession) {
        if (studySession == null)
            return null;
        return StudySessionDTO.builder()
                .id(studySession.getId())
                .date(studySession.getDate())
                .topic(studySession.getTopic())
                .timeSpentMinutes(studySession.getTimeSpentMinutes())
                .source(studySession.getSource())
                .notes(studySession.getNotes())
                .build();
    }

    public StudySession toEntity(StudySessionDTO dto) {
        if (dto == null)
            return null;
        return StudySession.builder()
                .id(dto.getId())
                .date(dto.getDate())
                .topic(dto.getTopic())
                .timeSpentMinutes(dto.getTimeSpentMinutes())
                .source(dto.getSource())
                .notes(dto.getNotes())
                .build();
    }
}
