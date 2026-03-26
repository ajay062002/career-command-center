package com.ajay.career.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class AnalyticsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    public void testGetDashboardSummary() throws Exception {
        mockMvc.perform(get("/api/analytics/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalJobs").exists())
                .andExpect(jsonPath("$.activeSubmissions").exists());
    }

    @Test
    public void testGetStudyTrend() throws Exception {
        mockMvc.perform(get("/api/analytics/study-trend"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(7));
    }

    @Test
    public void testGetJobsStatus() throws Exception {
        mockMvc.perform(get("/api/analytics/jobs-status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }
}
