package com.ajay.career.controller;

import com.ajay.career.dto.JobDTO;
import com.ajay.career.entity.JobStatus;
import com.ajay.career.entity.WorkMode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.Objects;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class JobControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    public void testCreateJob() throws Exception {
        JobDTO jobDTO = JobDTO.builder()
                .jobTitle("Test Job")
                .companyName("Test Company")
                .status(JobStatus.APPLIED)
                .appliedDate(LocalDate.now())
                .workMode(WorkMode.REMOTE)
                .build();

        mockMvc.perform(post("/api/jobs")
                .contentType(Objects.requireNonNull(MediaType.APPLICATION_JSON))
                .content(Objects.requireNonNull(objectMapper.writeValueAsString(jobDTO))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.jobTitle").value("Test Job"))
                .andExpect(jsonPath("$.companyName").value("Test Company"));
    }

    @Test
    public void testGetAllJobs() throws Exception {
        mockMvc.perform(get("/api/jobs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    public void testGetJobsByStatus() throws Exception {
        mockMvc.perform(get("/api/jobs/status?status=APPLIED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }
}
