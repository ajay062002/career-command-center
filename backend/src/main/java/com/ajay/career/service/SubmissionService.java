package com.ajay.career.service;

import com.ajay.career.dto.SubmissionDTO;

import java.util.List;
import java.util.UUID;

public interface SubmissionService {
    List<SubmissionDTO> getAllSubmissions();

    SubmissionDTO createSubmission(SubmissionDTO dto);

    SubmissionDTO updateSubmission(UUID id, SubmissionDTO dto);

    void deleteSubmission(UUID id);
}
