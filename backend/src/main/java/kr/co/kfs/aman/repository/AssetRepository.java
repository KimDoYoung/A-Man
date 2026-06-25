package kr.co.kfs.aman.repository;

import kr.co.kfs.aman.model.Asset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssetRepository extends JpaRepository<Asset, Long> {
    List<Asset> findByAtype(String atype);
    List<Asset> findByAtypeAndNameContaining(String atype, String name);
    List<Asset> findByNameContaining(String name);
}
