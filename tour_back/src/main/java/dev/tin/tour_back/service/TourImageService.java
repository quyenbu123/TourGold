package dev.tin.tour_back.service;

import dev.tin.tour_back.entity.TourEntity;
import dev.tin.tour_back.entity.TourImageEntity;
import dev.tin.tour_back.repository.TourImageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TourImageService {

    @Value("${upload.path:static/images}")
    private String uploadPath;

    private final TourImageRepository tourImageRepository;

    /**
     * Thêm hình ảnh chính cho tour
     * @param tour Tour cần thêm hình ảnh
     * @param image File hình ảnh
     * @return TourImageEntity đã được lưu
     */
    public TourImageEntity addMainImageToTour(TourEntity tour, MultipartFile image) {
        if (image == null || image.isEmpty()) {
            throw new IllegalArgumentException("Hình ảnh không được để trống");
        }

        // Kiểm tra xem tour đã có hình ảnh chưa
        Optional<TourImageEntity> existingMainImage = tourImageRepository.findFirstByTourIdOrderByIdAsc(tour.getId());
        
        // Nếu có hình ảnh chính, xóa nó đi
        if (existingMainImage.isPresent()) {
            deleteImageFile(existingMainImage.get().getUrl());
            tourImageRepository.delete(existingMainImage.get());
        }
        
        // Lưu hình ảnh mới
        String imageUrl = saveImageToStatic(image);
        TourImageEntity mainImageEntity = new TourImageEntity();
        mainImageEntity.setUrl(imageUrl);
        mainImageEntity.setTour(tour);
        return tourImageRepository.save(mainImageEntity);
    }

    /**
     * Thêm nhiều hình ảnh cho tour
     * @param tour Tour cần thêm hình ảnh
     * @param images Danh sách file hình ảnh
     * @return Danh sách TourImageEntity đã được lưu
     */
    public List<TourImageEntity> addImagesToTour(TourEntity tour, List<MultipartFile> images) {
        if (images == null || images.isEmpty()) {
            throw new IllegalArgumentException("Danh sách hình ảnh không được để trống");
        }

        List<TourImageEntity> savedImages = new ArrayList<>();
        for (MultipartFile image : images) {
            if (image != null && !image.isEmpty()) {
                String imageUrl = saveImageToStatic(image);
                TourImageEntity imageEntity = new TourImageEntity();
                imageEntity.setUrl(imageUrl);
                imageEntity.setTour(tour);
                savedImages.add(tourImageRepository.save(imageEntity));
            }
        }
        return savedImages;
    }

    /**
     * Xóa hình ảnh
     * @param imageId ID của hình ảnh cần xóa
     */
    public void deleteImage(Long imageId) {
        Optional<TourImageEntity> imageOpt = tourImageRepository.findById(imageId);
        if (imageOpt.isPresent()) {
            TourImageEntity image = imageOpt.get();
            deleteImageFile(image.getUrl());
            tourImageRepository.delete(image);
        }
    }

    /**
     * Lấy tất cả hình ảnh của một tour
     * @param tour Tour cần lấy hình ảnh
     * @return Danh sách hình ảnh của tour
     */
    public List<TourImageEntity> getImagesByTour(TourEntity tour) {
        return tourImageRepository.findByTourIdOrderByIdAsc(tour.getId());
    }

    /**
     * Lưu file hình ảnh vào thư mục static
     * @param image File hình ảnh cần lưu
     * @return URL của hình ảnh đã lưu
     */
    private String saveImageToStatic(MultipartFile image) {
        try {
            // Tạo thư mục nếu chưa có
            Path path = Path.of(uploadPath);
            if (!Files.exists(path)) {
                Files.createDirectories(path);
            }

            // Lấy tên tệp ảnh và tạo đường dẫn lưu trữ
            String fileName = System.currentTimeMillis() + ".jpg"; // hoặc bạn có thể lấy từ tên file gốc
            Path filePath = path.resolve(fileName);

            // Lưu ảnh vào thư mục static/images/
            Files.copy(image.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            // Trả về URL tương đối của ảnh
            return "http://localhost:8080/static/images/" + fileName;
        } catch (IOException e) {
            throw new RuntimeException("Lỗi khi lưu ảnh vào thư mục local", e);
        }
    }

    /**
     * Xóa file hình ảnh từ hệ thống file
     * @param imageUrl URL của hình ảnh cần xóa
     */
    private void deleteImageFile(String imageUrl) {
        try {
            // Extract filename from URL
            String fileName = imageUrl.substring(imageUrl.lastIndexOf("/") + 1);
            Path imagePath = Paths.get(uploadPath, fileName);
            
            // Delete the file if it exists
            if (Files.exists(imagePath)) {
                Files.delete(imagePath);
            }
        } catch (Exception e) {
            // Log the error but don't throw it
            System.err.println("Error deleting image file: " + e.getMessage());
        }
    }
}
