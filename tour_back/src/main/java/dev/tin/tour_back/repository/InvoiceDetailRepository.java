package dev.tin.tour_back.repository;

import dev.tin.tour_back.entity.InvoiceDetailEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvoiceDetailRepository extends JpaRepository<InvoiceDetailEntity, Long> {
}