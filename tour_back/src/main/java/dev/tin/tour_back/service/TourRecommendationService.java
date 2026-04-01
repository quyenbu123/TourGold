package dev.tin.tour_back.service;

import dev.tin.tour_back.entity.TourEntity;
import dev.tin.tour_back.entity.UserEntity;
import dev.tin.tour_back.entity.UserTourViewEntity;
import dev.tin.tour_back.model.FeaturedTour;
import dev.tin.tour_back.repository.TourRepository;
import dev.tin.tour_back.repository.UserTourViewRepository;
import dev.tin.tour_back.repository.UserTourViewEventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class TourRecommendationService {
    private static final Logger log = LoggerFactory.getLogger(TourRecommendationService.class);

    private final UserTourViewRepository userTourViewRepository;
    private final TourRepository tourRepository;
    private final FeaturedTourService featuredTourService;
    private final UserTourViewEventRepository userTourViewEventRepository;

    public TourRecommendationService(UserTourViewRepository userTourViewRepository,
                                     TourRepository tourRepository,
                                     FeaturedTourService featuredTourService,
                                     UserTourViewEventRepository userTourViewEventRepository) {
        this.userTourViewRepository = userTourViewRepository;
        this.tourRepository = tourRepository;
        this.featuredTourService = featuredTourService;
        this.userTourViewEventRepository = userTourViewEventRepository;
    }

    /**
     * New recommendation algorithm (2-day, 2-tour, 2-type):
     * 1) Look at user's view events in the last 2 days (now - 48h).
     * 2) Pick the top 2 tours by view count in that window ("baseline tours").
     * 3) From those 2 tours, choose 2 types:
     *    - If there are at least 2 common types: take any two from the intersection.
     *    - If exactly 1 common type: pick that 1 + 1 random type from the union of the two tours' types.
     *    - If no common types: pick 2 random distinct types from the union (or 1 if only 1 available).
     * 4) Recommend tours that belong to these 2 chosen types (no exclusion by viewed tours per spec).
     * 5) Re-running the API recomputes from current data (stateless), so refreshing home recomputes suggestions.
     *
     * Fallbacks:
     * - If not enough events in the last 2 days: use user's all-time top-views; if still missing, use top featured tours as baselines.
     * - If we cannot get 2 types from baselines: sample from available types on baseline tours; if still none, fallback to featured tours; if still none, return any non-deleted tours.
     *
     * @param user  Authenticated user entity (required for personalized recommendations)
     * @param limit Maximum number of recommendations (bounded to 1..50 by controller)
     * @return List of TourEntity recommendations (may be empty)
     */
    @Transactional(readOnly = true)
    public List<TourEntity> recommendForUser(UserEntity user, int limit) {
        if (user == null) return Collections.emptyList();
        long t0 = System.currentTimeMillis();
        log.info("[recs2] start userId={} limit={}", user.getId(), limit);

        // 1) last 2 days window
        java.time.LocalDateTime since = java.time.LocalDateTime.now().minusDays(2);
        List<Object[]> countsSince = userTourViewEventRepository.findTopTourCountsSince(user.getId(), since);
        List<Long> baselineIds = countsSince.stream()
                .map(r -> (Long) r[0])
                .distinct()
                .limit(2)
                .collect(Collectors.toList());
        log.info("[recs2] baseline (last2days) tourIds={} rawSize={}", baselineIds, countsSince.size());

        // Fallback to all-time top views if not enough
        if (baselineIds.size() < 2) {
            List<UserTourViewEntity> allTime = userTourViewRepository.findTop10ByUser_IdOrderByViewCountDesc(user.getId());
            for (UserTourViewEntity v : allTime) {
                if (!baselineIds.contains(v.getTour().getId())) baselineIds.add(v.getTour().getId());
                if (baselineIds.size() == 2) break;
            }
            log.info("[recs2] baseline after all-time fallback: {}", baselineIds);
        }

        // Fallback to featured if still not enough
        if (baselineIds.size() < 2) {
            List<Long> featured = featuredTourService.getTopFeaturedTours(5).stream()
                    .map(FeaturedTour::getTourId).collect(Collectors.toList());
            for (Long id : featured) {
                if (!baselineIds.contains(id)) baselineIds.add(id);
                if (baselineIds.size() == 2) break;
            }
            log.info("[recs2] baseline after featured fallback: {}", baselineIds);
        }

        if (baselineIds.isEmpty()) {
            // Absolute fallback
            List<TourEntity> any = tourRepository.findAll().stream()
                    .filter(t -> (t.getIsDeleted() == null || !t.getIsDeleted()))
                    .limit(limit)
                    .collect(Collectors.toList());
            log.info("[recs2] no baseline -> any size={} in {}ms", any.size(), (System.currentTimeMillis()-t0));
            return any;
        }

        // 2) Fetch baseline tours to inspect types
        List<TourEntity> baselineTours = new ArrayList<>();
        tourRepository.findAllById(baselineIds).forEach(baselineTours::add);
        if (baselineTours.isEmpty()) {
            List<TourEntity> any = tourRepository.findAll().stream()
                    .filter(t -> (t.getIsDeleted() == null || !t.getIsDeleted()))
                    .limit(limit)
                    .collect(Collectors.toList());
            log.info("[recs2] baseline fetch empty -> any size={} in {}ms", any.size(), (System.currentTimeMillis()-t0));
            return any;
        }

        // 3) Choose 2 types per spec
        Set<Long> typesUnion = new HashSet<>();
        Set<Long> typesIntersect = null;
        for (TourEntity t : baselineTours) {
            Set<Long> cur = t.getTypeOfTourEntities() == null ? Collections.emptySet() :
                    t.getTypeOfTourEntities().stream().map(tt -> tt.getId()).collect(Collectors.toSet());
            typesUnion.addAll(cur);
            if (typesIntersect == null) typesIntersect = new HashSet<>(cur); else typesIntersect.retainAll(cur);
        }
        if (typesIntersect == null) typesIntersect = new HashSet<>();
        log.info("[recs2] types union={} intersect={}", typesUnion, typesIntersect);

        List<Long> chosenTypes = new ArrayList<>();
        java.util.concurrent.ThreadLocalRandom rnd = java.util.concurrent.ThreadLocalRandom.current();
        if (typesIntersect.size() >= 2) {
            chosenTypes.addAll(typesIntersect.stream().limit(2).collect(Collectors.toList()));
        } else if (typesIntersect.size() == 1) {
            Long common = typesIntersect.iterator().next();
            chosenTypes.add(common);
            // pick 1 random from union excluding common if possible
            List<Long> pool = typesUnion.stream().filter(id -> !id.equals(common)).collect(Collectors.toList());
            if (!pool.isEmpty()) {
                chosenTypes.add(pool.get(rnd.nextInt(pool.size())));
            } else {
                chosenTypes.add(common); // only one type exists overall
            }
        } else { // no common types
            List<Long> pool = new ArrayList<>(typesUnion);
            if (pool.size() >= 2) {
                // pick two distinct randoms
                int i = rnd.nextInt(pool.size());
                Long first = pool.remove(i);
                Long second = pool.get(rnd.nextInt(pool.size()));
                chosenTypes.add(first);
                chosenTypes.add(second);
            } else if (pool.size() == 1) {
                chosenTypes.add(pool.get(0));
            }
        }
        log.info("[recs2] chosenTypes={} (size={})", chosenTypes, chosenTypes.size());

        // If still no types, fallback to featured tours directly
        if (chosenTypes.isEmpty()) {
            List<Long> featuredIds = featuredTourService.getTopFeaturedTours(limit).stream()
                    .map(FeaturedTour::getTourId).collect(Collectors.toList());
            List<TourEntity> featuredTours = new ArrayList<>();
            tourRepository.findAllById(featuredIds).forEach(featuredTours::add);
            log.info("[recs2] chosenTypes empty -> featured size={} in {}ms", featuredTours.size(), (System.currentTimeMillis()-t0));
            return featuredTours.stream().limit(limit).collect(Collectors.toList());
        }

        // 4) Get candidates by chosen types (no exclusion of viewed per new spec)
        List<TourEntity> candidates = tourRepository.findDisplayedByTypeIds(chosenTypes);
        log.info("[recs2] candidates.size={} for chosenTypes={} ", candidates.size(), chosenTypes);

        // Shuffle to avoid bias and then limit
        Collections.shuffle(candidates, new java.util.Random());
        List<TourEntity> result = candidates.stream()
                .filter(t -> (t.getIsDeleted() == null || !t.getIsDeleted()))
                .limit(limit)
                .collect(Collectors.toList());

        // 5) Fallback if empty
        if (result.isEmpty()) {
            List<Long> featuredIds = featuredTourService.getTopFeaturedTours(limit).stream()
                    .map(FeaturedTour::getTourId).collect(Collectors.toList());
            List<TourEntity> featuredTours = new ArrayList<>();
            tourRepository.findAllById(featuredIds).forEach(featuredTours::add);
            result = featuredTours.stream().limit(limit).collect(Collectors.toList());
            if (result.isEmpty()) {
                result = tourRepository.findAll().stream()
                        .filter(t -> (t.getIsDeleted() == null || !t.getIsDeleted()))
                        .limit(limit)
                        .collect(Collectors.toList());
            }
        }

        log.info("[recs2] done userId={} limit={} returned={} in {}ms", user.getId(), limit, result.size(), (System.currentTimeMillis()-t0));
        return result;
    }

    // old scoring class removed in new algorithm
}
