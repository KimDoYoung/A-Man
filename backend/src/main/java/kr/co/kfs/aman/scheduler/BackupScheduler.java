package kr.co.kfs.aman.scheduler;

import kr.co.kfs.aman.service.BackupService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class BackupScheduler {

    private static final Logger log = LoggerFactory.getLogger(BackupScheduler.class);

    private final BackupService backupService;

    @Value("${aman.backup.enabled:true}")
    private boolean enabled;

    public BackupScheduler(BackupService backupService) {
        this.backupService = backupService;
    }

    @Scheduled(cron = "${aman.backup.cron:0 30 12,23 * * ?}")
    public void runScheduledBackup() {
        if (!enabled) {
            log.info("백업 스케줄러가 활성화되어 있지 않습니다.");
            return;
        }
        log.info("스케줄러에 의한 백업 태스크 실행...");
        backupService.executeBackup(false);
    }
}
