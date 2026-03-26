package com.ajay.career.service;

import com.ajay.career.dto.JobDTO;
import com.ajay.career.entity.JobStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface JobService {
    JobDTO createJob(JobDTO dto);

    JobDTO updateJob(UUID id, JobDTO dto);

    JobDTO getJobById(UUID id);

    Page<JobDTO> getAllJobs(Pageable pageable);

    void deleteJob(UUID id);

    Page<JobDTO> getJobsByStatus(JobStatus status, Pageable pageable);

    List<JobDTO> searchByCompany(String companyName);
}
