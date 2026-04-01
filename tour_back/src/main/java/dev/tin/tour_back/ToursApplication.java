package dev.tin.tour_back;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling  // Enable scheduling for cleanup tasks
public class ToursApplication {

	public static void main(String[] args) {

		SpringApplication.run(ToursApplication.class, args);
	}
}
