package kr.co.kfs.aman.controller;

import kr.co.kfs.aman.model.Asset;
import kr.co.kfs.aman.repository.AssetRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/assets")
public class AssetController {

    private final AssetRepository assetRepository;
    private static final List<String> ALLOWED_TYPES = Arrays.asList("EMOJI", "PHRASE", "TEMPLATE", "SYMBOL");

    public AssetController(AssetRepository assetRepository) {
        this.assetRepository = assetRepository;
    }

    @GetMapping
    public ResponseEntity<?> getAssets(
            @RequestParam(value = "atype", required = false) String atype,
            @RequestParam(value = "name", required = false) String name) {
        
        List<Asset> list;
        if (atype != null && !atype.trim().isEmpty()) {
            String cleanType = atype.trim().toUpperCase();
            if (name != null && !name.trim().isEmpty()) {
                list = assetRepository.findByAtypeAndNameContaining(cleanType, name.trim());
            } else {
                list = assetRepository.findByAtype(cleanType);
            }
        } else if (name != null && !name.trim().isEmpty()) {
            list = assetRepository.findByNameContaining(name.trim());
        } else {
            list = assetRepository.findAll();
        }
        return ResponseEntity.ok(list);
    }

    @GetMapping("/emoji-palette")
    public ResponseEntity<?> getEmojiPalette() {
        java.util.List<Asset> list = assetRepository.findByAtypeOrderByIdAsc("EMOJI");
        if (list.isEmpty()) {
            return ResponseEntity.ok(java.util.Collections.emptyList());
        }
        String[] parts = list.get(0).getValue().split(",");
        java.util.List<String> emojis = new java.util.ArrayList<>();
        for (String p : parts) {
            String t = p.trim();
            if (!t.isEmpty()) {
                emojis.add(t);
            }
        }
        return ResponseEntity.ok(emojis);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getAssetById(@PathVariable("id") Long id) {
        Optional<Asset> assetOpt = assetRepository.findById(id);
        if (!assetOpt.isPresent()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("존재하지 않는 자산입니다.");
        }
        return ResponseEntity.ok(assetOpt.get());
    }

    @PostMapping
    public ResponseEntity<?> saveAsset(@RequestBody Asset asset) {
        if (!isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("관리자만 자산을 관리할 수 있습니다.");
        }

        if (asset.getAtype() == null || !ALLOWED_TYPES.contains(asset.getAtype().trim().toUpperCase())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("올바르지 않은 자산 타입입니다. 허용 타입: EMOJI, PHRASE, TEMPLATE, SYMBOL");
        }
        if (asset.getName() == null || asset.getName().trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("자산 이름은 필수입니다.");
        }
        if (asset.getValue() == null || asset.getValue().trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("자산 값(내용)은 필수입니다.");
        }

        asset.setAtype(asset.getAtype().trim().toUpperCase());
        asset.setName(asset.getName().trim());
        asset.setValue(asset.getValue().trim());

        if ("EMOJI".equals(asset.getAtype()) || "SYMBOL".equals(asset.getAtype())) {
            String[] items = asset.getValue().split(",");
            java.util.List<String> cleanedItems = new java.util.ArrayList<>();
            for (String item : items) {
                String trimmed = item.trim();
                if (!trimmed.isEmpty()) {
                    if (trimmed.length() > 10) {
                        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                .body("이모지 및 기호의 각 개별 요소는 10자 이하여야 합니다: '" + trimmed + "'");
                    }
                    if (!cleanedItems.contains(trimmed)) {
                        cleanedItems.add(trimmed);
                    }
                }
            }
            if (cleanedItems.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("유효한 이모지/기호 요소가 없습니다.");
            }
            asset.setValue(String.join(", ", cleanedItems));
        }

        Asset savedAsset;
        if (asset.getId() != null) {
            Optional<Asset> existingOpt = assetRepository.findById(asset.getId());
            if (!existingOpt.isPresent()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("수정하려는 자산이 존재하지 않습니다.");
            }
            Asset existing = existingOpt.get();
            existing.setAtype(asset.getAtype());
            existing.setName(asset.getName());
            existing.setValue(asset.getValue());
            savedAsset = assetRepository.save(existing);
        } else {
            savedAsset = assetRepository.save(asset);
        }

        return ResponseEntity.ok(savedAsset);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAsset(@PathVariable("id") Long id) {
        if (!isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("관리자만 자산을 삭제할 수 있습니다.");
        }

        Optional<Asset> assetOpt = assetRepository.findById(id);
        if (!assetOpt.isPresent()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("존재하지 않는 자산입니다.");
        }

        assetRepository.deleteById(id);
        return ResponseEntity.ok("자산이 정상적으로 삭제되었습니다.");
    }

    private boolean isAdmin() {
        return SecurityContextHolder.getContext().getAuthentication().getAuthorities()
                .stream()
                .anyMatch(auth -> "ROLE_ADMIN".equals(auth.getAuthority()));
    }
}
