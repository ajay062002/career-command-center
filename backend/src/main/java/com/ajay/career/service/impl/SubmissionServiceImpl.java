package com.ajay.career.service.impl;

import com.ajay.career.dto.SubmissionDTO;
import com.ajay.career.entity.Job;
import com.ajay.career.entity.JobStatus;
import com.ajay.career.entity.Submission;
import com.ajay.career.mapper.SubmissionMapper;
import com.ajay.career.repository.JobRepository;
import com.ajay.career.repository.SubmissionRepository;
import com.ajay.career.service.SubmissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class SubmissionServiceImpl implements SubmissionService {

    private final SubmissionRepository submissionRepository;
    private final JobRepository jobRepository;
    private final SubmissionMapper submissionMapper;

    @Override
    @Transactional(readOnly = true)
    public List<SubmissionDTO> getAllSubmissions() {
        return submissionRepository.findAll().stream()
                .map(submissionMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public SubmissionDTO createSubmission(SubmissionDTO dto) {
        Submission submission = submissionMapper.toEntity(dto, null);
        submission.setId(null);
        Submission saved = submissionRepository.save(submission);
        syncJobStatus(saved);
        return submissionMapper.toDTO(saved);
    }

    @Override
    public SubmissionDTO updateSubmission(UUID id, SubmissionDTO dto) {
        Submission existing = submissionRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new RuntimeException("Submission not found"));
        Submission updated = submissionMapper.toEntity(dto, existing.getJob());
        updated.setId(id);
        Submission saved = submissionRepository.save(updated);
        syncJobStatus(saved);
        return submissionMapper.toDTO(saved);
    }

    private void syncJobStatus(Submission submission) {
        if (submission.getJob() == null)
            return;

        Job job = submission.getJob();
        if (job != null) {
            switch (submission.getSubmissionStatus()) {
                case SUBMITTED -> job.setStatus(JobStatus.SUBMITTED);
                case SCREENING -> job.setStatus(JobStatus.SCREENING);
                case INTERVIEW, INTERVIEW_SCHEDULED -> job.setStatus(JobStatus.INTERVIEWING);
                case REJECTED -> job.setStatus(JobStatus.REJECTED);
                default -> {
                    /* No status update */ }
            }
            jobRepository.save(job); // Explicit save for persistence reliability
        }
    }

    @Override
    public void deleteSubmission(UUID id) {
        if (!submissionRepository.existsById(Objects.requireNonNull(id))) {
            throw new RuntimeException("Submission not found");
        }
        submissionRepository.deleteById(Objects.requireNonNull(id));
    }
}
