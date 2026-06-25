package kr.co.kfs.aman.repository;

import kr.co.kfs.aman.model.Setting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SettingRepository extends JpaRepository<Setting, Long> {
    Optional<Setting> findBySettingKey(String settingKey);
}
