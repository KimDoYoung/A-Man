package kr.co.kfs.aman.repository;

import kr.co.kfs.aman.model.UserSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserSettingRepository extends JpaRepository<UserSetting, Long> {
    Optional<UserSetting> findBySettingKey(String settingKey);
    Optional<UserSetting> findByUserIdAndSettingKey(Long userId, String settingKey);
}
