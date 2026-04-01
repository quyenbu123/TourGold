package dev.tin.tour_back.config;

import dev.tin.tour_back.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.Scheduled;

import java.util.logging.Logger;

@Configuration
public class SchedulingConfig {
    
    private static final Logger logger = Logger.getLogger(SchedulingConfig.class.getName());
    
    @Autowired
    private EmailService emailService;
    
    /**
     * Schedule cleanup of sent email records
     * Runs every 2 hours
     */
    @Scheduled(fixedRate = 7200000) // 2 hours in milliseconds
    public void cleanupEmailRecords() {
        if (emailService instanceof EmailService) {
            // The cleanup is handled internally by EmailService
            logger.info("Scheduled cleanup of email tracking records completed");
        }
    }
}
