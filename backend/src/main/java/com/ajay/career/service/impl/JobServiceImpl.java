package com.ajay.career.service.impl;

import com.ajay.career.dto.JobDTO;
import com.ajay.career.entity.Job;
import com.ajay.career.entity.JobStatus;
import com.ajay.career.mapper.JobMapper;
import com.ajay.career.repository.JobRepository;
import com.ajay.career.service.JobService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class JobServiceImpl implements JobService {

    private final JobRepository jobRepository;
    private final JobMapper jobMapper;

    @Override
    public JobDTO createJob(JobDTO dto) {
        Job job = jobMapper.toEntity(dto);
        job.setId(null); // Ensure new ID generation
        return jobMapper.toDTO(jobRepository.save(job));
    }

    @Override
    public JobDTO updateJob(UUID id, JobDTO dto) {
        if (!jobRepository.existsById(Objects.requireNonNull(id))) {
            throw new RuntimeException("Job not found");
        }
        Job job = jobMapper.toEntity(dto);
        job.setId(id);
        return jobMapper.toDTO(jobRepository.save(job));
    }

    @Override
    @Transactional(readOnly = true)
    public JobDTO getJobById(UUID id) {
        return jobRepository.findById(Objects.requireNonNull(id))
                .map(jobMapper::toDTO)
                .orElseThrow(() -> new RuntimeException("Job not found"));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<JobDTO> getAllJobs(Pageable pageable) {
        return jobRepository.findAll(Objects.requireNonNull(pageable)).map(jobMapper::toDTO);
    }

    @Override
    public void deleteJob(UUID id) {
        if (!jobRepository.existsById(Objects.requireNonNull(id))) {
            throw new RuntimeException("Job not found");
        }
        jobRepository.deleteById(Objects.requireNonNull(id));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<JobDTO> getJobsByStatus(JobStatus status, Pageable pageable) {
        return jobRepository.findByStatus(status, pageable).map(jobMapper::toDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public List<JobDTO> searchByCompany(String companyName) {
        return jobRepository.findByCompanyNameContainingIgnoreCase(companyName).stream()
                .map(jobMapper::toDTO)
                .collect(Collectors.toList());
    }
}
