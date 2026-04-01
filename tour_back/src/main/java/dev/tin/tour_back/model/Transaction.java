package dev.tin.tour_back.model;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class Transaction {
    private String id;
    private String description;
    private Long amount;
    private LocalDateTime when;
    private String method;
    private String bank;
    private String status;
} 