package kr.co.kfs.aman.service;

import kr.co.kfs.aman.config.SystemSettings;
import kr.co.kfs.aman.model.Setting;
import kr.co.kfs.aman.repository.SettingRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import java.io.File;
import java.text.SimpleDateFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class BackupService {

    private static final Logger log = LoggerFactory.getLogger(BackupService.class);
    private static final DateTimeFormatter DF = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final DateTimeFormatter TS_DF = DateTimeFormatter.ofPattern("yyyy-MM-dd_HH_mm_ss");

    @PersistenceContext
    private EntityManager entityManager;

    private final SettingRepository settingRepository;
    private final SystemSettings systemSettings;

    @Value("${aman.image-dir}")
    private String imageDir;

    @Value("${aman.backup.dir}")
    private String backupDir;

    @Value("${aman.backup.retention-days:30}")
    private int retentionDays;

    public BackupService(SettingRepository settingRepository, SystemSettings systemSettings) {
        this.settingRepository = settingRepository;
        this.systemSettings = systemSettings;
    }

    /**
     * pages, folders 테이블에서 구한 전체 시스템의 최종 수정 일시 획득
     */
    public LocalDateTime getLastModifyTime() {
        LocalDateTime maxPageUpdate = null;
        LocalDateTime maxPageCreate = null;
        LocalDateTime maxFolderCreate = null;

        try {
            maxPageUpdate = entityManager.createQuery("SELECT MAX(p.updatedAt) FROM Page p", LocalDateTime.class).getSingleResult();
        } catch (Exception e) { /* ignored */ }
        try {
            maxPageCreate = entityManager.createQuery("SELECT MAX(p.createdAt) FROM Page p", LocalDateTime.class).getSingleResult();
        } catch (Exception e) { /* ignored */ }
        try {
            maxFolderCreate = entityManager.createQuery("SELECT MAX(f.createdAt) FROM Folder f", LocalDateTime.class).getSingleResult();
        } catch (Exception e) { /* ignored */ }

        LocalDateTime max = LocalDateTime.of(1970, 1, 1, 0, 0, 0);
        if (maxPageUpdate != null && maxPageUpdate.isAfter(max)) max = maxPageUpdate;
        if (maxPageCreate != null && maxPageCreate.isAfter(max)) max = maxPageCreate;
        if (maxFolderCreate != null && maxFolderCreate.isAfter(max)) max = maxFolderCreate;

        return max;
    }

    /**
     * settings 테이블에서 최근 백업 성공 시간 획득
     */
    public LocalDateTime getLastBackupTime() {
        Optional<Setting> settingOpt = settingRepository.findBySettingKey("LAST_BACKUP_TIME");
        if (settingOpt.isPresent()) {
            String val = settingOpt.get().getSettingValue();
            if (val != null && !val.trim().isEmpty()) {
                try {
                    return LocalDateTime.parse(val.trim(), DF);
                } catch (Exception e) {
                    log.warn("LAST_BACKUP_TIME 파싱 실패: {}", val, e);
                }
            }
        }
        return LocalDateTime.of(1970, 1, 1, 0, 0, 0);
    }

    /**
     * 백업 실행 비즈니스 로직
     */
    @Transactional
    public boolean executeBackup(boolean force) {
        LocalDateTime lastModify = getLastModifyTime();
        LocalDateTime lastBackup = getLastBackupTime();

        if (!force && lastBackup != null && (lastBackup.isAfter(lastModify) || lastBackup.isEqual(lastModify))) {
            log.info("변동사항이 감지되지 않아 백업 작업을 건너뜁니다. (최근 백업: {}, 최종 수정: {})", lastBackup.format(DF), lastModify.format(DF));
            return false;
        }

        log.info("백업 프로세스를 시작합니다. (최근 백업: {}, 최종 수정: {})", lastBackup.format(DF), lastModify.format(DF));

        File dir = new File(backupDir);
        if (!dir.exists()) {
            dir.mkdirs();
        }

        // 짝이 맞는 시간 접미사 생성
        LocalDateTime now = LocalDateTime.now();
        String timeSuffix = now.format(TS_DF);

        try {
            // 1. DB 백업 생성 (VACUUM INTO)
            File dbBackupFile = new File(dir, "aman." + timeSuffix + ".db");
            if (dbBackupFile.exists()) {
                dbBackupFile.delete();
            }
            entityManager.createNativeQuery("VACUUM INTO '" + dbBackupFile.getAbsolutePath() + "'").executeUpdate();
            log.info("SQLite DB 백업 파일 생성 완료: {}", dbBackupFile.getName());

            // 2. 이미지 백업 생성 (Linux tar -czf)
            File imagesTarGz = new File(dir, "images-" + timeSuffix + ".tar.gz");
            if (imagesTarGz.exists()) {
                imagesTarGz.delete();
            }
            tarGzImages(imagesTarGz);
            log.info("이미지 폴더 백업 파일 생성 완료: {}", imagesTarGz.getName());

            // 3. settings 테이블의 LAST_BACKUP_TIME 업데이트
            updateLastBackupTime(now.format(DF));

            // 4. 백업 폴더 Retention 보존 관리
            runRetentionCleanup();
            return true;
        } catch (Exception e) {
            log.error("백업 프로세스 중 에러 발생", e);
            throw new RuntimeException("백업 실패: " + e.getMessage(), e);
        }
    }

    private void tarGzImages(File tarGzFile) throws Exception {
        File imageFolder = new File(imageDir);
        if (!imageFolder.exists()) {
            imageFolder.mkdirs();
        }
        File parentDir = imageFolder.getParentFile();
        String folderName = imageFolder.getName();

        // 리눅스 tar 프로세스를 실행하여 압축
        ProcessBuilder pb = new ProcessBuilder("tar", "-czf", tarGzFile.getAbsolutePath(), "-C", parentDir.getAbsolutePath(), folderName);
        Process process = pb.start();
        int exitCode = process.waitFor();
        if (exitCode != 0) {
            throw new RuntimeException("tar 압축 실패: exitCode=" + exitCode);
        }
    }

    private void updateLastBackupTime(String timeStr) {
        Setting setting = settingRepository.findBySettingKey("LAST_BACKUP_TIME")
                .orElse(null);
        if (setting == null) {
            setting = Setting.builder()
                    .settingKey("LAST_BACKUP_TIME")
                    .settingValue(timeStr)
                    .note("최근 정기 백업 성공 시각 (yyyy-MM-dd HH:mm:ss)")
                    .build();
        } else {
            setting.setSettingValue(timeStr);
        }
        settingRepository.save(setting);
        systemSettings.reload();
    }

    private void runRetentionCleanup() {
        File dir = new File(backupDir);
        if (!dir.exists()) return;

        // 1. *.war 파일 정리: 최신 10개만 보존
        File[] warFiles = dir.listFiles((d, name) -> name.endsWith(".war"));
        if (warFiles != null && warFiles.length > 10) {
            Arrays.sort(warFiles, (f1, f2) -> Long.compare(f2.lastModified(), f1.lastModified()));
            for (int i = 10; i < warFiles.length; i++) {
                if (warFiles[i].delete()) {
                    log.info("오래된 WAR 백업 제거 완료: {}", warFiles[i].getName());
                }
            }
        }

        // 2. *.gz 파일 정리: 최신 30개만 보존하고 그에 매칭되는 *.db 파일도 함께 지움
        File[] gzFiles = dir.listFiles((d, name) -> name.endsWith(".gz"));
        if (gzFiles != null && gzFiles.length > 30) {
            Arrays.sort(gzFiles, (f1, f2) -> Long.compare(f2.lastModified(), f1.lastModified()));
            for (int i = 30; i < gzFiles.length; i++) {
                File gzFile = gzFiles[i];
                String name = gzFile.getName();
                if (name.startsWith("images-") && name.endsWith(".tar.gz")) {
                    String ts = name.substring("images-".length(), name.length() - ".tar.gz".length());
                    File dbFile = new File(dir, "aman." + ts + ".db");
                    if (dbFile.exists()) {
                        dbFile.delete();
                        log.info("오래된 매칭 DB 백업 제거 완료: {}", dbFile.getName());
                    }
                }
                if (gzFile.delete()) {
                    log.info("오래된 이미지 백업 제거 완료: {}", name);
                }
            }
        }
    }

    /**
     * 백업 디렉토리 내의 백업 대상 리스트 반환
     */
    public List<Map<String, Object>> getBackupFiles() {
        List<Map<String, Object>> list = new ArrayList<>();
        File dir = new File(backupDir);
        if (!dir.exists()) return list;

        File[] files = dir.listFiles((d, name) -> name.endsWith(".war") || name.endsWith(".db") || name.endsWith(".gz"));
        if (files == null) return list;

        // 최신 생성된 날짜순 정렬
        Arrays.sort(files, (f1, f2) -> Long.compare(f2.lastModified(), f1.lastModified()));

        for (File f : files) {
            Map<String, Object> map = new HashMap<>();
            map.put("name", f.getName());
            map.put("size", f.length());
            map.put("lastModified", new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new Date(f.lastModified())));
            
            String type = "OTHER";
            if (f.getName().endsWith(".war")) type = "WAR";
            else if (f.getName().endsWith(".db")) type = "DATABASE";
            else if (f.getName().endsWith(".gz")) type = "IMAGES";
            map.put("type", type);
            
            list.add(map);
        }
        return list;
    }
}
