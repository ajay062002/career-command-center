package com.ajay.career.service;

import com.ajay.career.dto.RTRDTO;

import java.util.List;
import java.util.UUID;

public interface RTRService {
    List<RTRDTO> getAllRTRs();

    RTRDTO createRTR(RTRDTO dto);

    RTRDTO updateRTR(UUID id, RTRDTO dto);

    void deleteRTR(UUID id);
}
