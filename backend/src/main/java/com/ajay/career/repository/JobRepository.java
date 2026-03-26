package com.ajay.career.repository;

import com.ajay.career.entity.Job;
import com.ajay.career.entity.JobStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface JobRepository extends JpaRepository<Job, UUID> {

    Page<Job> findByStatus(JobStatus status, Pageable pageable);

    List<Job> findByCompanyNameContainingIgnoreCase(String companyName);

    List<Job> findByVendorCompanyContainingIgnoreCase(String vendorCompany);

    List<Job> findByAppliedDateBetween(LocalDate start, LocalDate end);

    long countByStatus(JobStatus status);

    @Query("SELECT j.status, COUNT(j) FROM Job j GROUP BY j.status")
    List<Object[]> countJobsByStatus();
}
