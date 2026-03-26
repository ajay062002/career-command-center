package com.ajay.career.service.impl;

import com.ajay.career.dto.RTRDTO;
import com.ajay.career.dto.ReminderDTO;
import com.ajay.career.dto.SubmissionDTO;
import com.ajay.career.entity.*;
import com.ajay.career.mapper.RTRMapper;
import com.ajay.career.repository.RTRRepository;
import com.ajay.career.service.RTRService;
import com.ajay.career.service.ReminderService;
import com.ajay.career.service.SubmissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class RTRServiceImpl implements RTRService {

    private final RTRRepository rtrRepository;
    private final RTRMapper rtrMapper;
    private final ReminderService reminderService;
    private final SubmissionService submissionService;

    @Override
    @Transactional(readOnly = true)
    public List<RTRDTO> getAllRTRs() {
        return rtrRepository.findAll().stream()
                .map(rtrMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public RTRDTO createRTR(RTRDTO dto) {
        RTR rtr = rtrMapper.toEntity(dto, null);
        rtr.setId(null);
        RTR savedRtr = rtrRepository.save(rtr);

        // Auto-create reminder after 2 days
        ReminderDTO reminder = ReminderDTO.builder()
                .title("Follow up on RTR: " + savedRtr.getRole() + " (" + savedRtr.getVendorCompany() + ")")
                .type(ReminderType.FOLLOW_UP)
                .dueDate(LocalDate.now().plusDays(2))
                .completed(false)
                .notes("Automatic follow-up for RTR authorization")
                .jobId(savedRtr.getJob() != null ? savedRtr.getJob().getId() : null)
                .build();

        reminderService.createReminder(reminder.getJobId(), reminder);

        return rtrMapper.toDTO(savedRtr);
    }

    @Override
    public RTRDTO updateRTR(UUID id, RTRDTO dto) {
        RTR existingRtr = rtrRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new RuntimeException("RTR not found"));

        RTR updatedRtr = rtrMapper.toEntity(dto, existingRtr.getJob());
        updatedRtr.setId(id);
        RTR savedRtr = rtrRepository.save(updatedRtr);

        // FEATURE Automation: RTR to Submission Promotion (Case Insensitive)
        if (savedRtr.getStatus() != null && savedRtr.getStatus().equalsIgnoreCase("Submitted")) {
            SubmissionDTO submission = SubmissionDTO.builder()
                    .jobId(savedRtr.getJob() != null ? savedRtr.getJob().getId() : null)
                    .submissionStatus(SubmissionStatus.SUBMITTED)
                    .submissionDate(LocalDate.now())
                    .submittedByVendor(savedRtr.getVendorCompany())
                    .vendorPhone(savedRtr.getVendorPhone())
                    .vendorEmail(savedRtr.getVendorEmail())
                    .rateSubmitted("$" + savedRtr.getRate() + "/hr")
                    .notes("Promoted from RTR (Client: " + savedRtr.getClientName() + ", Role: " + savedRtr.getRole()
                            + ")")
                    .build();

            submissionService.createSubmission(submission);
        }

        return rtrMapper.toDTO(savedRtr);
    }

    @Override
    public void deleteRTR(UUID id) {
        if (!rtrRepository.existsById(Objects.requireNonNull(id))) {
            throw new RuntimeException("RTR not found");
        }
        rtrRepository.deleteById(Objects.requireNonNull(id));
    }
}
