package com.ajay.career.repository;

import com.ajay.career.entity.RTR;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RTRRepository extends JpaRepository<RTR, UUID> {

    @EntityGraph(attributePaths = {"job"})
    @Query("SELECT r FROM RTR r")
    List<RTR> findAllWithJob();

    List<RTR> findByJobId(UUID jobId);

    List<RTR> findByStatus(String status);

    long countByStatusNot(String status);

    @Query("SELECT r.vendorCompany, COUNT(r) FROM RTR r GROUP BY r.vendorCompany")
    List<Object[]> getVendorRtrCounts();
}
