package com.ajay.career.mapper;

import com.ajay.career.dto.JobDTO;
import com.ajay.career.entity.Job;
import org.springframework.stereotype.Component;

@Component
public class JobMapper {

    public JobDTO toDTO(Job job) {
        if (job == null)
            return null;
        return JobDTO.builder()
                .id(job.getId())
                .jobTitle(job.getJobTitle())
                .companyName(job.getCompanyName())
                .vendorCompany(job.getVendorCompany())
                .vendorContactName(job.getVendorContactName())
                .vendorContactEmail(job.getVendorContactEmail())
                .location(job.getLocation())
                .workMode(job.getWorkMode())
                .status(job.getStatus())
                .appliedDate(job.getAppliedDate())
                .notes(job.getNotes())
                .build();
    }

    public Job toEntity(JobDTO dto) {
        if (dto == null)
            return null;
        return Job.builder()
                .id(dto.getId())
                .jobTitle(dto.getJobTitle())
                .companyName(dto.getCompanyName())
                .vendorCompany(dto.getVendorCompany())
                .vendorContactName(dto.getVendorContactName())
                .vendorContactEmail(dto.getVendorContactEmail())
                .location(dto.getLocation())
                .workMode(dto.getWorkMode())
                .status(dto.getStatus())
                .appliedDate(dto.getAppliedDate())
                .notes(dto.getNotes())
                .build();
    }
}
