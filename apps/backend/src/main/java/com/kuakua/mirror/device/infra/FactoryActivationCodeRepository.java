package com.kuakua.mirror.device.infra;

import com.kuakua.mirror.device.domain.FactoryActivationCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FactoryActivationCodeRepository extends JpaRepository<FactoryActivationCode, Long> {

    Optional<FactoryActivationCode> findByCodeHash(String codeHash);
}
