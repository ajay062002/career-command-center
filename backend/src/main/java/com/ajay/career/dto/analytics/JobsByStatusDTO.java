package com.ajay.career.dto.analytics;

import com.ajay.career.entity.JobStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobsByStatusDTO {
    private JobStatus status;
    private long count;
}
