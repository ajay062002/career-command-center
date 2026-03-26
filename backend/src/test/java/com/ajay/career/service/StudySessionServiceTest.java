package com.ajay.career.service;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
public class StudySessionServiceTest {

    @Autowired
    private StudySessionService studySessionService;

    @Test
    public void testGetTotalMinutesBetween() {
        LocalDate end = LocalDate.now();
        LocalDate start = end.minusDays(7);

        Integer totalMinutes = studySessionService.getTotalMinutesBetween(start, end);

        assertNotNull(totalMinutes);
        assertTrue(totalMinutes >= 0);
    }
}
