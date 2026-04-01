package dev.tin.tour_back.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.concurrent.TimeUnit;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
    registry.addResourceHandler("/static/**")
        .addResourceLocations(
            "file:static/",
            "classpath:/static/")
        .setCacheControl(CacheControl.maxAge(365, TimeUnit.DAYS));

    // Backward-compat mapping: serve /images/** from the same static images location
    registry.addResourceHandler("/images/**")
        .addResourceLocations(
            "file:static/images/",
            "classpath:/static/images/")
        .setCacheControl(CacheControl.maxAge(365, TimeUnit.DAYS));
    }
}
