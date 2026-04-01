package dev.tin.tour_back.controller;

import dev.tin.tour_back.entity.InvoiceDetailEntity;
import dev.tin.tour_back.service.InvoiceDetailService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/invoice-details")
@RequiredArgsConstructor
public class InvoiceDetailController {
    private final InvoiceDetailService invoiceDetailService;

    @GetMapping
    public ResponseEntity<List<InvoiceDetailEntity>> getAllInvoiceDetails() {
        return new ResponseEntity<>(invoiceDetailService.getAllInvoiceDetails(), HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getInvoiceDetailById(@PathVariable Long id) {
        InvoiceDetailEntity invoiceDetail = invoiceDetailService.getInvoiceDetailById(id);
        if (invoiceDetail == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Không tìm thấy chi tiết hóa đơn với id: " + id);
        }
        return ResponseEntity.ok(invoiceDetail);
    }

    @PostMapping("/link")
    public ResponseEntity<?> linkPaymentToInvoice(@RequestBody Map<String, Object> payload) {
        try {
            Long invoiceId = Long.valueOf(payload.get("invoiceId").toString());
            Long paymentId = Long.valueOf(payload.get("paymentId").toString());
            Double paidAmount = Double.valueOf(payload.get("paidAmount").toString());

            InvoiceDetailEntity savedInvoiceDetail = invoiceDetailService.linkPaymentToInvoice(
                    invoiceId, paymentId, paidAmount);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Đã liên kết thanh toán với hóa đơn thành công");
            response.put("invoiceDetailId", savedInvoiceDetail.getId());

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body("Lỗi khi liên kết thanh toán với hóa đơn: " + e.getMessage());
        }
    }
}