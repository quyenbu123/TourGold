package dev.tin.tour_back.service;

import dev.tin.tour_back.entity.InvoiceDetailEntity;

import dev.tin.tour_back.entity.InvoiceEntity;
import dev.tin.tour_back.entity.PaymentEntity;
import dev.tin.tour_back.repository.InvoiceDetailRepository;
import dev.tin.tour_back.repository.InvoiceRepository;
import dev.tin.tour_back.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class InvoiceDetailService {
    private final InvoiceDetailRepository invoiceDetailRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    
    public List<InvoiceDetailEntity> getAllInvoiceDetails() {
        return invoiceDetailRepository.findAll();
    }
    
    public InvoiceDetailEntity getInvoiceDetailById(Long id) {
        return invoiceDetailRepository.findById(id).orElse(null);
    }
    
    @Transactional
    public InvoiceDetailEntity linkPaymentToInvoice(Long invoiceId, Long paymentId, Double paidAmount) {
        InvoiceEntity invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy hóa đơn với ID: " + invoiceId));
        
        PaymentEntity payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thanh toán với ID: " + paymentId));
        
        // Tạo liên kết
        InvoiceDetailEntity invoiceDetail = new InvoiceDetailEntity();
        invoiceDetail.setInvoice(invoice);
        invoiceDetail.setPayment(payment);
        invoiceDetail.setPaidAmount(paidAmount);
        invoiceDetail.setPaymentDate(LocalDateTime.now());
        invoiceDetail.setStatus("COMPLETED");
        
        return invoiceDetailRepository.save(invoiceDetail);
    }
}