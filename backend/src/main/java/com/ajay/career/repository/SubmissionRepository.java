package com.ajay.career.repository;

import com.ajay.career.entity.Submission;
import com.ajay.career.entity.SubmissionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, UUID> {

    List<Submission> findByJobId(UUID jobId);

    List<Submission> findBySubmissionStatus(SubmissionStatus status);

    List<Submission> findBySubmissionDateBetween(LocalDate start, LocalDate end);

    long countBySubmissionStatus(SubmissionStatus status);

    @Query("SELECT s.submittedByVendor, COUNT(s), SUM(CASE WHEN s.submissionStatus = com.ajay.career.entity.SubmissionStatus.INTERVIEW_SCHEDULED THEN 1 ELSE 0 END) "
            +
            "FROM Submission s GROUP BY s.submittedByVendor")
    List<Object[]> getVendorPerformanceMetrics();
}
