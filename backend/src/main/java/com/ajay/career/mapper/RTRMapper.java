package com.ajay.career.mapper;

import com.ajay.career.dto.RTRDTO;
import com.ajay.career.entity.Job;
import com.ajay.career.entity.RTR;
import org.springframework.stereotype.Component;

@Component
public class RTRMapper {

    public RTRDTO toDTO(RTR rtr) {
        if (rtr == null)
            return null;
        return RTRDTO.builder()
                .id(rtr.getId())
                .jobId(rtr.getJob() != null ? rtr.getJob().getId() : null)
                .date(rtr.getDate())
                .vendorName(rtr.getVendorName())
                .vendorCompany(rtr.getVendorCompany())
                .clientName(rtr.getClientName())
                .vendorPhone(rtr.getVendorPhone())
                .vendorEmail(rtr.getVendorEmail())
                .rate(rtr.getRate())
                .role(rtr.getRole())
                .location(rtr.getLocation())
                .status(rtr.getStatus())
                .build();
    }

    public RTR toEntity(RTRDTO dto, Job job) {
        if (dto == null)
            return null;
        return RTR.builder()
                .id(dto.getId())
                .job(job)
                .date(dto.getDate())
                .vendorName(dto.getVendorName())
                .vendorCompany(dto.getVendorCompany())
                .clientName(dto.getClientName())
                .vendorPhone(dto.getVendorPhone())
                .vendorEmail(dto.getVendorEmail())
                .rate(dto.getRate())
                .role(dto.getRole())
                .location(dto.getLocation())
                .status(dto.getStatus())
                .build();
    }
}
