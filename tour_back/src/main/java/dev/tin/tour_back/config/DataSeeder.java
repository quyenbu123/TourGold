package dev.tin.tour_back.config;

import dev.tin.tour_back.entity.*;
import dev.tin.tour_back.repository.*;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Random;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class DataSeeder {

    private static final Map<String, List<String>> TOUR_IMAGE_MAP = Map.ofEntries(
        Map.entry("Du ngoạn cố đô Huế", List.of("codo.jpg", "codo1.jpg", "codo2.jpg", "codo3.jpg")),
        Map.entry("Khám phá phố cổ Hà Nội", List.of("hanoi.jpg", "hanoi1.jpg", "hanoi2.jpg", "hanoi3.jpg")),
        Map.entry("Du thuyền sang trọng Hạ Long", List.of("halong.jpg", "halong1.jpg", "halong2.jpg", "halong3.jpg")),
        Map.entry("Trải nghiệm miền Tây sông nước", List.of("mientay.jpg", "mientay1.jpg", "mientay2.jpg")),
        Map.entry("Ruộng bậc thang Sapa", List.of("sapa.jpg", "sapa1.jpg", "sapa2.jpg", "sapa3.jpg")),
        Map.entry("Nghỉ dưỡng phố cổ Hội An", List.of("phoco.jpg", "phoco1.jpg", "phoco2.jpg", "phoco3.jpg")),
        Map.entry("Thiên đường đảo Phú Quốc", List.of("phuquoc.jpg", "phuquoc1.jpg", "phuquoc2.jpg", "phuquoc3.jpg")),
        Map.entry("Ẩn mình Đà Lạt cao nguyên", List.of("dalat.jpg", "dalat1.jpg", "dalat2.jpg", "dalat3.jpg")),
        Map.entry("Hành trình khám phá Việt Nam", List.of("vietnam.jpg", "vietnam1.jpg", "vietnam2.jpg", "vietnam3.jpg"))
    );

    private final TourRepository tourRepository;
    private final TypeOfTourRepository typeOfTourRepository;
    private final TourPriceRepository tourPriceRepository;
    private final ItineraryRepository itineraryRepository;
    private final ServiceRepository serviceRepository;
    private final TypeOfServiceRepository typeOfServiceRepository;
    private final TourImageRepository tourImageRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final BookingRepository bookingRepository;
    private final BookingStatusRepository bookingStatusRepository;
    private final InvoiceRepository invoiceRepository;
    private final InvoiceDetailRepository invoiceDetailRepository;
    private final PaymentRepository paymentRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${upload.path:static/images}")
    private String uploadPath;

    private int imageIndex = 0;
    private final Random random = new Random();

    @Bean
    @Transactional
    CommandLineRunner initDatabase() {
        return args -> {
            log.info("Starting data seeding...");

            // Kiểm tra nếu đã có dữ liệu thì không seed nữa
            if (tourRepository.count() > 0) {
                log.info("Database already seeded. Skipping...");
                return;
            }

            // 1. Seed Roles
            seedRoles();

            // 2. Seed Users
            List<UserEntity> users = seedUsers();

            // 3. Seed TypeOfTour
            List<TypeOfTourEntity> tourTypes = seedTourTypes();

            // 4. Seed TypeOfService
            List<TypeOfServiceEntity> serviceTypes = seedServiceTypes();

            // 5. Seed Tours with all related data
            List<TourEntity> tours = seedTours(tourTypes, serviceTypes);

            // 6. Seed BookingStatus
            List<BookingStatusEntity> bookingStatuses = seedBookingStatuses();

            // 7. Seed Bookings, Invoices, and Payments
            seedBookingsAndPayments(users, tours, bookingStatuses);

            log.info("Data seeding completed successfully!");
        };
    }

    private void seedRoles() {
        log.info("Seeding roles...");
        ensureRoleExists("ROLE_ADMIN");
        ensureRoleExists("ROLE_USER");
        ensureRoleExists("ROLE_HOST");
        log.info("Roles ensured: ROLE_ADMIN, ROLE_USER, ROLE_HOST");
    }

    private void ensureRoleExists(String roleName) {
        roleRepository.findByName(roleName).orElseGet(() -> {
            RoleEntity r = new RoleEntity();
            r.setName(roleName);
            return roleRepository.save(r);
        });
    }

    private List<UserEntity> seedUsers() {
        log.info("Seeding users...");
        List<UserEntity> users = new ArrayList<>();

        if (userRepository.count() == 0) {
            // Get the saved roles from the database
            RoleEntity adminRole = roleRepository.findByName("ROLE_ADMIN")
                .orElseThrow(() -> new RuntimeException("Admin role not found"));

            RoleEntity userRole = roleRepository.findByName("ROLE_USER")
                .orElseThrow(() -> new RuntimeException("User role not found"));

            // Create admin user
            UserEntity admin = new UserEntity();
            admin.setUsername("admin");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setEmail("admin@tourgold.vn");
            admin.setFullName("Quản trị viên TourGold");
            admin.setRoles(new ArrayList<>());
            admin = userRepository.save(admin); // Save first to get ID
            admin.getRoles().add(adminRole);
            userRepository.save(admin);
            users.add(admin);

            // Create regular user
            UserEntity user = new UserEntity();
            user.setUsername("user");
            user.setPassword(passwordEncoder.encode("user123"));
            user.setEmail("khach@tourgold.vn");
            user.setFullName("Khách trải nghiệm");
            user.setRoles(new ArrayList<>());
            user = userRepository.save(user); // Save first to get ID
            user.getRoles().add(userRole);
            userRepository.save(user);
            users.add(user);

            // Create additional users for more realistic data
            String[][] additionalUsers = {
                {"ngoc_anh", "password123", "ngoc.anh@tourgold.vn", "Ngọc Anh"},
                {"minh_khoa", "password123", "minh.khoa@tourgold.vn", "Minh Khoa"},
                {"bao_tran", "password123", "bao.tran@tourgold.vn", "Bảo Trân"},
                {"thanh_tung", "password123", "thanh.tung@tourgold.vn", "Thanh Tùng"}
            };

            for (String[] userData : additionalUsers) {
                UserEntity newUser = new UserEntity();
                newUser.setUsername(userData[0]);
                newUser.setPassword(passwordEncoder.encode(userData[1]));
                newUser.setEmail(userData[2]);
                newUser.setFullName(userData[3]);
                newUser.setRoles(new ArrayList<>());
                newUser = userRepository.save(newUser);
                newUser.getRoles().add(userRole);
                userRepository.save(newUser);
                users.add(newUser);
            }

            log.info("Users seeded successfully");
        } else {
            users = userRepository.findAll();
        }

        return users;
    }

    private List<TypeOfTourEntity> seedTourTypes() {
        log.info("Seeding tour types...");
        List<TypeOfTourEntity> types = new ArrayList<>();

        if (typeOfTourRepository.count() == 0) {
            String[] tourTypeNames = {
                "Phiêu lưu", "Biển đảo", "Văn hóa", "Du lịch sinh thái",
                "Gia đình", "Cao cấp", "Lịch sử", "Thiên nhiên hoang dã",
                "Ẩm thực", "Nhiếp ảnh", "Trekking", "Du thuyền",
                "Homestay", "Bản sắc dân tộc", "Tâm linh", "Đô thị"
            };

            for (String name : tourTypeNames) {
                TypeOfTourEntity type = new TypeOfTourEntity();
                type.setName(name);
                types.add(type);
            }

            types = typeOfTourRepository.saveAll(types);
            log.info("Tour types seeded successfully");
        } else {
            types = typeOfTourRepository.findAll();
        }

        return types;
    }

    private List<TypeOfServiceEntity> seedServiceTypes() {
        log.info("Seeding service types...");
        List<TypeOfServiceEntity> types = new ArrayList<>();

        if (typeOfServiceRepository.count() == 0) {
            String[] serviceTypeNames = {
                "Lưu trú", "Di chuyển", "Ẩm thực & đồ uống",
                "Hướng dẫn", "Hoạt động", "Bảo hiểm", "Thiết bị đặc biệt"
            };

            for (String name : serviceTypeNames) {
                TypeOfServiceEntity type = new TypeOfServiceEntity();
                type.setName(name);
                type.setDescription("Dịch vụ " + name.toLowerCase() + " dành cho du khách");
                types.add(type);
            }

            types = typeOfServiceRepository.saveAll(types);
            log.info("Service types seeded successfully");
        } else {
            types = typeOfServiceRepository.findAll();
        }

        return types;
    }

    private List<TourEntity> seedTours(List<TypeOfTourEntity> tourTypes, List<TypeOfServiceEntity> serviceTypes) {
        log.info("Seeding tours with related data...");
        List<TourEntity> tours = new ArrayList<>();

        // Prepare image files
        File imagesDir = new File(uploadPath);
        File[] imageFiles = imagesDir.listFiles((dir, name) -> name.endsWith(".jpg"));

        if (imageFiles == null || imageFiles.length == 0) {
            log.warn("No image files found in " + uploadPath);
            return tours;
        }

        // Create tours with more detailed information
        String[][] tourData = {
            {"Hành trình khám phá Việt Nam", "Lên đường trong chuyến hành trình không thể quên dọc đất nước hình chữ S, hòa mình vào di sản văn hóa, cảnh sắc hùng vĩ và nền ẩm thực tinh tế. Từ phố phường Hà Nội tấp nập đến mặt nước Hạ Long yên bình, lịch trình kết hợp hoàn hảo giữa phiêu lưu, thư giãn và trải nghiệm bản địa.", "2024-12-01T08:00:00", "2024-12-10T18:00:00", "20", "APPROVED"},

            {"Khám phá phố cổ Hà Nội", "Tìm về vẻ đẹp nghìn năm của Thăng Long – Hà Nội. Dạo bộ trong khu phố cổ, ghé thăm Văn Miếu, Hoàng thành, thưởng thức đặc sản đường phố và xem biểu diễn nghệ thuật truyền thống. Lịch trình còn có hoạt động giao lưu cùng nghệ nhân làng nghề.", "2024-11-15T09:00:00", "2024-11-18T17:00:00", "15", "APPROVED"},

            {"Du thuyền sang trọng Hạ Long", "Du ngoạn trên làn nước ngọc bích của di sản thiên nhiên thế giới Vịnh Hạ Long. Chiêm ngưỡng hàng nghìn núi đá vôi kỳ vĩ, khám phá hang động, chèo kayak, tắm biển và thưởng thức bữa tối thượng hạng trong không gian sang trọng.", "2024-10-20T07:00:00", "2024-10-22T16:00:00", "30", "APPROVED"},

            {"Trải nghiệm miền Tây sông nước", "Ngược dòng về vùng Đồng bằng sông Cửu Long – vựa lúa trù phú của Việt Nam. Tham quan chợ nổi, miệt vườn, làng nghề truyền thống, thưởng thức đặc sản tại nhà dân và khám phá hệ sinh thái phong phú của vùng sông nước.", "2025-01-05T08:30:00", "2025-01-08T17:30:00", "25", "PENDING"},

            {"Ruộng bậc thang Sapa", "Băng qua những thửa ruộng bậc thang đẹp như tranh của vùng cao Tây Bắc. Gặp gỡ đồng bào H’Mông, Dao, nghỉ đêm tại homestay, cùng gia đình bản địa chuẩn bị bữa cơm và tìm hiểu nghề thủ công truyền thống.", "2025-02-10T06:00:00", "2025-02-15T18:00:00", "12", "APPROVED"},

            {"Du ngoạn cố đô Huế", "Tạm gác nhịp sống hiện đại để trở về thời vàng son của triều Nguyễn. Tham quan Hoàng thành, lăng tẩm, chùa cổ, du thuyền sông Hương và thưởng thức yến tiệc cung đình đậm chất Huế.", "2025-03-05T09:00:00", "2025-03-08T16:00:00", "18", "APPROVED"},

            {"Nghỉ dưỡng phố cổ Hội An", "Đắm mình trong vẻ đẹp cổ kính của Hội An – di sản thế giới với mái ngói rêu phong và phố lồng đèn rực rỡ. Học làm đèn, tham gia lớp nấu ăn, chèo thuyền thúng và thư giãn trên bãi biển An Bàng thanh bình.", "2025-04-10T08:00:00", "2025-04-15T17:00:00", "22", "APPROVED"},

            {"Thiên đường đảo Phú Quốc", "Trốn khỏi nhịp sống bộn bề để tận hưởng thiên nhiên nhiệt đới tại đảo Ngọc. Tắm biển Bãi Sao, khám phá rừng quốc gia, thăm nhà thùng nước mắm, thưởng hải sản và tham gia hoạt động lặn ngắm san hô, câu mực đêm.", "2025-05-20T10:00:00", "2025-05-27T12:00:00", "30", "APPROVED"},

            {"Ẩn mình Đà Lạt cao nguyên", "Cảm nhận không khí se lạnh của thành phố ngàn hoa với kiến trúc Pháp lãng mạn. Tham quan nông trại cà phê, dâu tây, thác nước, thử sức với canyoning, đạp xe xuyên rừng thông hoặc đơn giản là thưởng trà trong sương sớm.", "2025-06-15T08:30:00", "2025-06-20T16:30:00", "16", "APPROVED"}
        };

        for (int i = 0; i < tourData.length; i++) {
            String[] data = tourData[i];

            TourEntity tour = new TourEntity();
            tour.setName(data[0]);
            tour.setDescription(data[1]);
            tour.setStartDate(LocalDateTime.parse(data[2]));
            tour.setEndDate(LocalDateTime.parse(data[3]));
            tour.setMaxQuantity(Integer.parseInt(data[4]));
            tour.setApprovalStatus(data[5]);
            tour.setIsDeleted(false);
            tour.setIsDisplayed(true);

            // Save tour first without types
            tour = tourRepository.save(tour);

            // Add tour types (1-3 random types) after saving the tour
            int numTypes = 1 + random.nextInt(3); // 1 to 3 types
            for (int j = 0; j < numTypes && j < tourTypes.size(); j++) {
                Long typeId = tourTypes.get((i + j) % tourTypes.size()).getId();
                TypeOfTourEntity tourType = typeOfTourRepository.findById(typeId)
                    .orElseThrow(() -> new RuntimeException("Tour type not found"));
                tour.getTypeOfTourEntities().add(tourType);
            }

            // Save tour again with the types
            tour = tourRepository.save(tour);

            // Add tour prices
            addTourPrices(tour);

            // Add itineraries
            addItineraries(tour);

            // Add services
            addServices(tour, serviceTypes);

            // Add images (1 main + 1-2 additional)
            addImages(tour, imageFiles, imageIndex);
            imageIndex = (imageIndex + 3) % imageFiles.length; // Move index for next tour

            tours.add(tour);
            log.info("Created tour: " + tour.getName());
        }

        return tours;
    }

    private void addTourPrices(TourEntity tour) {
        // Add 2 price options (adult and child)
        TourPriceEntity adultPrice = new TourPriceEntity();
        adultPrice.setTour(tour);
    adultPrice.setName("Người lớn");
        adultPrice.setPrice(1000000L + (long)(random.nextDouble() * 9000000)); // 1M-10M VND
    adultPrice.setDescription("Gói tiêu chuẩn cho người lớn với đầy đủ tiện ích");
        tourPriceRepository.save(adultPrice);

        TourPriceEntity childPrice = new TourPriceEntity();
        childPrice.setTour(tour);
    childPrice.setName("Trẻ em");
        childPrice.setPrice(adultPrice.getPrice() / 2); // Half price for children
    childPrice.setDescription("Ưu đãi dành cho trẻ em dưới 12 tuổi");
        tourPriceRepository.save(childPrice);

        // Add a premium option
        TourPriceEntity premiumPrice = new TourPriceEntity();
        premiumPrice.setTour(tour);
    premiumPrice.setName("Gói cao cấp");
        premiumPrice.setPrice(adultPrice.getPrice() + 500000L); // Premium price
    premiumPrice.setDescription("Gói nâng cao với đặc quyền độc quyền và phục vụ VIP");
        tourPriceRepository.save(premiumPrice);
    }

    private void addItineraries(TourEntity tour) {
        // Create itinerary items for each day of the tour
        int numDays = (int) (tour.getEndDate().toLocalDate().toEpochDay() - tour.getStartDate().toLocalDate().toEpochDay()) + 1;
        numDays = Math.max(numDays, 1); // At least 1 day

        LocalDateTime currentDay = tour.getStartDate();

        for (int i = 0; i < numDays; i++) {
            // Morning activity
            ItineraryEntity morningItinerary = new ItineraryEntity();
            morningItinerary.setTour(tour);
            morningItinerary.setItinerary("Ngày " + (i+1) + " - Buổi sáng: " + getRandomItineraryDescription(i, "morning"));
            morningItinerary.setDate_time(currentDay.plusDays(i).withHour(8).withMinute(0));
            itineraryRepository.save(morningItinerary);

            // Afternoon activity
            ItineraryEntity afternoonItinerary = new ItineraryEntity();
            afternoonItinerary.setTour(tour);
            afternoonItinerary.setItinerary("Ngày " + (i+1) + " - Buổi chiều: " + getRandomItineraryDescription(i, "afternoon"));
            afternoonItinerary.setDate_time(currentDay.plusDays(i).withHour(13).withMinute(30));
            itineraryRepository.save(afternoonItinerary);

            // Evening activity (except for last day)
            if (i < numDays - 1 || tour.getName().contains("Cruise")) {
                ItineraryEntity eveningItinerary = new ItineraryEntity();
                eveningItinerary.setTour(tour);
                eveningItinerary.setItinerary("Ngày " + (i+1) + " - Buổi tối: " + getRandomItineraryDescription(i, "evening"));
                eveningItinerary.setDate_time(currentDay.plusDays(i).withHour(18).withMinute(30));
                itineraryRepository.save(eveningItinerary);
            }
        }
    }

    private String getRandomItineraryDescription(int day, String timeOfDay) {
        // More detailed and specific itinerary descriptions based on time of day
        if ("morning".equals(timeOfDay)) {
            String[] activities = {
                "Dùng bữa sáng tại khách sạn rồi tham quan khu phố cổ cùng hướng dẫn viên",
                "Dậy sớm đi chợ địa phương, cảm nhận đời sống bản địa và thưởng thức trái cây tươi",
                "Leo núi nhẹ trong khu bảo tồn thiên nhiên cùng hướng dẫn viên chuyên nghiệp",
                "Tham gia lớp nấu ăn với đầu bếp địa phương để học món truyền thống",
                "Viếng cụm đền chùa cổ và nghe kể chuyện lịch sử hấp dẫn",
                "Ngồi thuyền dọc kênh rạch ngắm cảnh và chụp ảnh",
                "Tham quan làng nghề thủ công, xem nghệ nhân thực hiện sản phẩm",
                "Đạp xe xuyên những làng quê yên bình"
            };
            return activities[day % activities.length];
        } else if ("afternoon".equals(timeOfDay)) {
            String[] activities = {
                "Ăn trưa đặc sản địa phương rồi tham quan bảo tàng văn hóa",
                "Khám phá di sản thế giới UNESCO cùng hướng dẫn viên",
                "Tắm biển và chơi các môn thể thao nước trên bãi cát hoang sơ",
                "Mua sắm tại làng nghề truyền thống và xem trình diễn chế tác",
                "Thăm đồi chè hoặc nông trại cà phê, thưởng thức ngay tại vườn",
                "Tham quan quần thể di tích với điểm nhấn kiến trúc",
                "Trải nghiệm zipline, cầu treo và các trò mạo hiểm",
                "Du thuyền ngắm hệ sinh thái hoang dã nơi bản địa"
            };
            return activities[(day + 3) % activities.length];
        } else {
            String[] activities = {
                "Thưởng thức bữa tối đặc sản vùng miền tại nhà hàng nổi tiếng",
                "Du thuyền buổi tối dùng bữa và nghe nhạc truyền thống",
                "Dạo chợ đêm, thử các món ăn đường phố hấp dẫn",
                "Xem biểu diễn nghệ thuật dân gian với múa và nhạc cổ truyền",
                "Ngắm hoàng hôn ở điểm cao rồi dùng bữa tối lãng mạn",
                "Tiệc nướng hải sản trên bãi biển dưới bầu trời đầy sao",
                "Food tour buổi tối qua nhiều khu phố bản địa",
                "Thư giãn spa, sau đó ăn tối tại nhà hàng khách sạn"
            };
            return activities[(day + 5) % activities.length];
        }
    }

    private void addServices(TourEntity tour, List<TypeOfServiceEntity> serviceTypes) {
        // Add 3-5 services
        int numServices = 3 + random.nextInt(3);

        for (int i = 0; i < numServices && i < serviceTypes.size(); i++) {
            ServiceEntity service = new ServiceEntity();
            service.setTour(tour);

            // Get a fresh reference to the service type
            Long typeId = serviceTypes.get(i % serviceTypes.size()).getId();
            TypeOfServiceEntity serviceType = typeOfServiceRepository.findById(typeId)
                .orElseThrow(() -> new RuntimeException("Service type not found"));
            service.setTypeOfService(serviceType);

            service.setName(getRandomServiceName(serviceType.getName()));
            service.setDescription("Dịch vụ " + serviceType.getName().toLowerCase() + " chất lượng giúp chuyến đi thoải mái");
            service.setPrice(200000L + (long)(random.nextDouble() * 800000)); // 200K-1M VND
            service.setAvailable(true);
            service.setCreatedAt(LocalDateTime.now());
            serviceRepository.save(service);
        }
    }

    private String getRandomServiceName(String type) {
        switch (type) {
            case "Lưu trú":
                String[] hotels = {"Khách sạn 4 sao", "Resort boutique", "Homestay bản địa", "Bungalow ven biển"};
                return hotels[random.nextInt(hotels.length)];
            case "Di chuyển":
                String[] transports = {"Xe riêng cao cấp", "Xe bus du lịch", "Tàu cao tốc", "Chuyến bay nội địa"};
                return transports[random.nextInt(transports.length)];
            case "Ẩm thực & đồ uống":
                String[] food = {"Ăn uống trọn gói", "Bữa sáng tại khách sạn", "Tiệc tối đặc biệt", "Thử ẩm thực địa phương"};
                return food[random.nextInt(food.length)];
            case "Hướng dẫn":
                String[] guides = {"Hướng dẫn viên song ngữ", "Chuyên gia địa phương", "Hướng dẫn viên nhiếp ảnh", "Chuyên gia lịch sử"};
                return guides[random.nextInt(guides.length)];
            default:
                return "Dịch vụ " + type.toLowerCase();
        }
    }

    private void addImages(TourEntity tour, File[] imageFiles, int startIndex) {
        try {
            List<String> preferredImages = TOUR_IMAGE_MAP.get(tour.getName());
            if (preferredImages != null && !preferredImages.isEmpty()) {
                for (String fileName : preferredImages) {
                    File specificFile = Paths.get(uploadPath, fileName).toFile();
                    if (!specificFile.exists()) {
                        log.warn("Image file not found for tour {}: {}", tour.getName(), specificFile.getAbsolutePath());
                        continue;
                    }
                    TourImageEntity image = createImageEntity(tour, specificFile);
                    tourImageRepository.save(image);
                }
                return;
            }

            // Add main image
            TourImageEntity mainImage = createImageEntity(tour, imageFiles[startIndex % imageFiles.length]);
            tourImageRepository.save(mainImage);

            // Add 1-2 additional images
            int additionalCount = 1 + random.nextInt(2);
            for (int i = 1; i <= additionalCount && i < imageFiles.length; i++) {
                TourImageEntity additionalImage = createImageEntity(
                    tour,
                    imageFiles[(startIndex + i) % imageFiles.length]
                );
                tourImageRepository.save(additionalImage);
            }
        } catch (Exception e) {
            log.error("Error adding images to tour: " + e.getMessage());
        }
    }

    private TourImageEntity createImageEntity(TourEntity tour, File imageFile) throws IOException {
        // Use the existing image file if it's already in the correct format
        String fileName = imageFile.getName();

        // If the file doesn't start with a timestamp, add one to avoid conflicts
        if (!fileName.matches("^\\d+_.*") && !fileName.matches("^\\d+\\..*")) {
            fileName = System.currentTimeMillis() + "_" + fileName;

            // Copy image to a new file with timestamp to avoid conflicts
            Path sourcePath = imageFile.toPath();
            Path targetPath = Paths.get(uploadPath, fileName);
            Files.copy(sourcePath, targetPath, StandardCopyOption.REPLACE_EXISTING);
        }

        // Create image entity
        TourImageEntity image = new TourImageEntity();
        image.setTour(tour);
        image.setUrl("/static/images/" + fileName);
        return image;
    }

    private List<BookingStatusEntity> seedBookingStatuses() {
        log.info("Seeding booking statuses...");
        List<BookingStatusEntity> statuses = new ArrayList<>();

        if (bookingStatusRepository.count() == 0) {
            String[][] statusData = {
                {"PENDING", "Đơn đặt đang chờ xác nhận"},
                {"CONFIRMED", "Đơn đặt đã được xác nhận"},
                {"CANCELLED", "Đơn đặt đã bị hủy"},
                {"COMPLETED", "Chuyến đi đã hoàn tất tốt đẹp"},
                {"PAYMENT_PENDING", "Thanh toán cho đơn đặt này đang chờ xử lý"},
                {"PAYMENT_CONFIRMED", "Thanh toán cho đơn đặt này đã được xác nhận"},
                {"PAYMENT_REJECTED", "Thanh toán cho đơn đặt này bị từ chối"},
                {"REFUNDED", "Đơn đặt đã được hoàn tiền"},
                {"PAID", "Đã nhận đủ thanh toán"}
            };

            for (String[] data : statusData) {
                BookingStatusEntity status = new BookingStatusEntity();
                status.setName(data[0]);
                status.setDescription(data[1]);
                status.setCreatedAt(LocalDateTime.now());
                statuses.add(status);
            }

            statuses = bookingStatusRepository.saveAll(statuses);
            log.info("Booking statuses seeded successfully");
        } else {
            statuses = bookingStatusRepository.findAll();
        }

        return statuses;
    }

    private void seedBookingsAndPayments(List<UserEntity> users, List<TourEntity> tours, List<BookingStatusEntity> statuses) {
        log.info("Seeding bookings, invoices, and payments...");

        if (bookingRepository.count() > 0) {
            log.info("Bookings already exist. Skipping booking seed.");
            return;
        }

        // Create a mapping of status names to entities for easy lookup
        BookingStatusEntity pendingStatus = getStatusByName(statuses, "PENDING");
        BookingStatusEntity confirmedStatus = getStatusByName(statuses, "CONFIRMED");
        BookingStatusEntity cancelledStatus = getStatusByName(statuses, "CANCELLED");
        BookingStatusEntity completedStatus = getStatusByName(statuses, "COMPLETED");
        BookingStatusEntity paymentPendingStatus = getStatusByName(statuses, "PAYMENT_PENDING");
        BookingStatusEntity paymentConfirmedStatus = getStatusByName(statuses, "PAYMENT_CONFIRMED");

        // Create 15-20 bookings across different users and tours
        int totalBookings = 15 + random.nextInt(6);

        for (int i = 0; i < totalBookings; i++) {
            // Select a random user and tour
            UserEntity user = users.get(random.nextInt(users.size()));
            TourEntity tour = tours.get(random.nextInt(tours.size()));

            // Create a booking
            BookingEntity booking = new BookingEntity();
            booking.setUser(user);
            booking.setTour(tour);

            // Set check-in and check-out dates
            LocalDateTime now = LocalDateTime.now();
            boolean pastBooking = random.nextBoolean();
            LocalDateTime checkInDate, checkOutDate;

            if (pastBooking) {
                // Past booking (1-60 days ago)
                int daysAgo = 1 + random.nextInt(60);
                checkInDate = now.minusDays(daysAgo);
                checkOutDate = checkInDate.plusDays(1 + random.nextInt(7)); // 1-7 day tour
            } else {
                // Future booking (1-90 days in the future)
                int daysAhead = 1 + random.nextInt(90);
                checkInDate = now.plusDays(daysAhead);
                checkOutDate = checkInDate.plusDays(1 + random.nextInt(7)); // 1-7 day tour
            }

            booking.setCheckInDate(checkInDate);
            booking.setCheckOutDate(checkOutDate);
            booking.setBookingTime(now.minusDays(random.nextInt(pastBooking ? 90 : 30))); // Booking made 0-90 days ago

            // Create invoice
            InvoiceEntity invoice = new InvoiceEntity();

            // Calculate total based on tour prices
            TourPriceEntity adultPrice = tour.getTourPrices().stream()
                .filter(p -> "Adult".equals(p.getName()))
                .findFirst()
                .orElse(null);

            double totalAmount = 0;
            int adults = 1 + random.nextInt(4); // 1-4 adults

            if (adultPrice != null) {
                totalAmount = adults * adultPrice.getPrice();
            } else {
                totalAmount = 2000000 + random.nextDouble() * 8000000; // 2M-10M VND
            }

            invoice.setDescription("Đặt tour " + tour.getName() + " - " + adults + " người lớn");
            invoice.setTotalAmount(totalAmount);
            invoice.setBillingDate(booking.getBookingTime());
            invoice.setCreatedAt(booking.getBookingTime());
            invoice = invoiceRepository.save(invoice);

            // Set the invoice in the booking
            booking.setInvoice(invoice);

            // Determine booking status based on dates and a bit of randomness
            BookingStatusEntity status;

            if (checkOutDate.isBefore(now)) {
                // Tour is in the past
                if (random.nextDouble() < 0.9) { // 90% completed successfully
                    status = completedStatus;
                } else { // 10% cancelled
                    status = cancelledStatus;
                }
            } else if (checkInDate.isBefore(now)) {
                // Tour is ongoing
                status = confirmedStatus;
            } else {
                // Tour is in the future
                double randomValue = random.nextDouble();
                if (randomValue < 0.3) { // 30% pending
                    status = pendingStatus;
                } else if (randomValue < 0.5) { // 20% payment pending
                    status = paymentPendingStatus;
                } else { // 50% confirmed
                    status = paymentConfirmedStatus;
                }
            }

            booking.setStatus(status);
            booking = bookingRepository.save(booking);

            // Add payment for confirmed or completed bookings
            if (status == paymentConfirmedStatus || status == confirmedStatus || status == completedStatus) {
                PaymentEntity payment = new PaymentEntity();
                payment.setUser(user);
                payment.setDate(booking.getBookingTime().plusMinutes(30 + random.nextInt(120))); // Payment made 30min-2hr after booking

                String[] paymentMethods = {"CREDIT_CARD", "BANK_TRANSFER", "PAYPAL", "CASH"};
                payment.setMethod(paymentMethods[random.nextInt(paymentMethods.length)]);
                payment.setAmount(invoice.getTotalAmount());
                payment.setStatus("SUCCESS");
                payment.setIsRefunded(false);
                payment = paymentRepository.save(payment);

                // Create invoice detail connecting payment to invoice
                InvoiceDetailEntity invoiceDetail = new InvoiceDetailEntity();
                invoiceDetail.setInvoice(invoice);
                invoiceDetail.setPayment(payment);
                invoiceDetail.setPaidAmount(payment.getAmount());
                invoiceDetail.setPaymentDate(payment.getDate());
                invoiceDetail.setStatus("COMPLETED");
                invoiceDetailRepository.save(invoiceDetail);
            }

            log.info("Created booking for tour: " + tour.getName() + " by user: " + user.getUsername() + " with status: " + status.getName());
        }
    }

    private BookingStatusEntity getStatusByName(List<BookingStatusEntity> statuses, String name) {
        return statuses.stream()
            .filter(s -> name.equals(s.getName()))
            .findFirst()
            .orElseThrow(() -> new RuntimeException("Status not found: " + name));
    }
}
