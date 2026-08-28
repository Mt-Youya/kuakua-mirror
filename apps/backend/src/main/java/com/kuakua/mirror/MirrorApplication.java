package com.kuakua.mirror;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 镜像应用主入口
 */
@SpringBootApplication
@EnableScheduling
public class MirrorApplication {

    public static void main(String[] args) {
        SpringApplication.run(MirrorApplication.class, args);
    }
}
