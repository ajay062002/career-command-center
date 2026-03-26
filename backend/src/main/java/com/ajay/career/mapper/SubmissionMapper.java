package com.ajay.career.mapper;

import com.ajay.career.dto.SubmissionDTO;
import com.ajay.career.entity.Job;
import com.ajay.career.entity.Submission;
import org.springframework.stereotype.Component;

@Component
public class SubmissionMapper {

    public SubmissionDTO toDTO(Submission submission) {
        if (submission == null)
            return null;

        String vendor = submission.getSubmittedByVendor();
        if ((vendor == null || vendor.trim().isEmpty()) && submission.getJob() != null) {
            vendor = submission.getJob().getVendorCompany();
        }

        return SubmissionDTO.builder()
                .id(submission.getId())
                .jobId(submission.getJob() != null ? submission.getJob().getId() : null)
                .submissionStatus(submission.getSubmissionStatus())
                .submissionDate(submission.getSubmissionDate())
                .submittedByVendor(vendor)
                .vendorPhone(submission.getVendorPhone())
                .vendorEmail(submission.getVendorEmail())
                .rateSubmitted(submission.getRateSubmitted())
                .followUpDate(submission.getFollowUpDate())
                .notes(submission.getNotes())
                .build();
    }

    public Submission toEntity(SubmissionDTO dto, Job job) {
        if (dto == null)
            return null;
        return Submission.builder()
                .id(dto.getId())
                .job(job)
                .submissionStatus(dto.getSubmissionStatus())
                .submissionDate(dto.getSubmissionDate())
                .submittedByVendor(dto.getSubmittedByVendor())
                .vendorPhone(dto.getVendorPhone())
                .vendorEmail(dto.getVendorEmail())
                .rateSubmitted(dto.getRateSubmitted())
                .followUpDate(dto.getFollowUpDate())
                .notes(dto.getNotes())
                .build();
    }
}
