package com.ajay.career.config;

import com.ajay.career.entity.*;
import com.ajay.career.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

@Configuration
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

        private final JobRepository jobRepository;
        private final RTRRepository rtrRepository;
        private final SubmissionRepository submissionRepository;
        private final ReminderRepository reminderRepository;

        @Override
        public void run(String... args) throws Exception {
                if (jobRepository.count() > 0) {
                        return;
                }

                // 1. Seed Jobs
                Job job1 = Job.builder()
                                .jobTitle("Senior Java Developer")
                                .companyName("Google")
                                .vendorCompany("Apex Systems")
                                .status(JobStatus.INTERVIEWING)
                                .appliedDate(LocalDate.now().minusDays(5))
                                .workMode(WorkMode.REMOTE)
                                .build();

                Job job2 = Job.builder()
                                .jobTitle("Full Stack Engineer")
                                .companyName("Meta")
                                .vendorCompany("Teksystems")
                                .status(JobStatus.APPLIED)
                                .appliedDate(LocalDate.now().minusDays(3))
                                .workMode(WorkMode.HYBRID)
                                .build();

                Job job3 = Job.builder()
                                .jobTitle("Backend Developer")
                                .companyName("Amazon")
                                .vendorCompany("Collabera")
                                .status(JobStatus.OFFER)
                                .appliedDate(LocalDate.now().minusDays(10))
                                .workMode(WorkMode.ONSITE)
                                .build();

                Job job4 = Job.builder()
                                .jobTitle("Software Engineer")
                                .companyName("Netflix")
                                .vendorCompany("Insight Global")
                                .status(JobStatus.REJECTED)
                                .appliedDate(LocalDate.now().minusDays(7))
                                .workMode(WorkMode.REMOTE)
                                .build();

                Job job5 = Job.builder()
                                .jobTitle("Java Architect")
                                .companyName("Apple")
                                .vendorCompany("Randstad")
                                .status(JobStatus.APPLIED)
                                .appliedDate(LocalDate.now().minusDays(1))
                                .workMode(WorkMode.REMOTE)
                                .build();

                jobRepository.saveAll(Objects.requireNonNull(List.of(job1, job2, job3, job4, job5)));

                // 2. Seed RTRs for Google and Meta jobs
                RTR rtr1 = RTR.builder()
                                .job(job1)
                                .date(LocalDate.now().minusDays(2))
                                .vendorName("John Smith")
                                .vendorCompany("Apex Systems")
                                .clientName("Google")
                                .vendorEmail("john@apex.com")
                                .vendorPhone("555-0101")
                                .rate(new java.math.BigDecimal("85.00"))
                                .role("Senior Java Developer")
                                .location("Mountain View, CA")
                                .status("Submitted")
                                .build();

                RTR rtr2 = RTR.builder()
                                .job(job2)
                                .date(LocalDate.now().minusDays(1))
                                .vendorName("Alice Johnson")
                                .vendorCompany("Teksystems")
                                .clientName("Meta")
                                .vendorEmail("alice@teksystems.com")
                                .vendorPhone("555-0102")
                                .rate(new java.math.BigDecimal("90.00"))
                                .role("Full Stack Engineer")
                                .location("Menlo Park, CA")
                                .status("Interview")
                                .build();

                rtrRepository.saveAll(Objects.requireNonNull(List.of(rtr1, rtr2)));

                // 3. Seed Submissions for Google and Amazon
                Submission sub1 = Submission.builder()
                                .job(job1)
                                .submissionStatus(SubmissionStatus.SUBMITTED)
                                .submissionDate(LocalDate.now().minusDays(4))
                                .submittedByVendor(job1.getVendorCompany())
                                .rateSubmitted("85/hr")
                                .build();

                Submission sub2 = Submission.builder()
                                .job(job3)
                                .submissionStatus(SubmissionStatus.INTERVIEW_SCHEDULED)
                                .submissionDate(LocalDate.now().minusDays(8))
                                .submittedByVendor(job3.getVendorCompany())
                                .rateSubmitted("90/hr")
                                .build();

                submissionRepository.saveAll(Objects.requireNonNull(List.of(sub1, sub2)));

                // 4. Seed StudySessions for the last 7 days
                // (Disabled by user request to clear existing data)
                /*
                 * for (int i = 0; i < 7; i++) {
                 * studySessionRepository.save(StudySession.builder()
                 * .date(LocalDate.now().minusDays(i))
                 * .topic("Spring Boot - Day " + i)
                 * .timeSpentMinutes(30 + (i * 15))
                 * .build());
                 * }
                 */
                // 5. Seed Reminders
                reminderRepository.saveAll(Objects.requireNonNull(List.of(
                                Reminder.builder()
                                                .title("Follow up with Apex")
                                                .dueDate(LocalDate.now().minusDays(1))
                                                .completed(false)
                                                .type(ReminderType.FOLLOW_UP)
                                                .job(job1)
                                                .build(),
                                Reminder.builder()
                                                .title("Update Resume")
                                                .dueDate(LocalDate.now())
                                                .completed(false)
                                                .type(ReminderType.TASK)
                                                .build(),
                                Reminder.builder()
                                                .title("Prepare for Amazon Interview")
                                                .dueDate(LocalDate.now().plusDays(2))
                                                .completed(false)
                                                .type(ReminderType.INTERVIEW)
                                                .job(job3)
                                                .build())));
        }
}
