plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.spring)
    alias(libs.plugins.kotlin.jpa)
    alias(libs.plugins.spring.boot)
    alias(libs.plugins.spring.dependency.management)
}

dependencies {
    implementation(project(":libs:common"))
    implementation(libs.kotlin.reflect)
    implementation(libs.jackson.module.kotlin)
    implementation(libs.spring.boot.starter.web)
    implementation(libs.spring.boot.starter.data.jpa)
    implementation(libs.spring.boot.starter.data.redis)
    implementation(libs.spring.boot.starter.oauth2.resource.server)
    implementation(libs.spring.boot.starter.actuator)
    implementation(libs.spring.boot.starter.kafka)
    implementation(libs.postgresql)
    implementation(libs.flyway.core)
    implementation(libs.flyway.postgresql)
    implementation(libs.micrometer.registry.prometheus)
    developmentOnly(libs.spring.boot.devtools)

    testImplementation(libs.spring.boot.test)
    testImplementation(libs.testcontainers.junit)
    testImplementation(libs.testcontainers.kafka)
}
