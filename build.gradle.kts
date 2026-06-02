plugins {
    alias(libs.plugins.kotlin.jvm) apply false
    alias(libs.plugins.kotlin.spring) apply false
    alias(libs.plugins.kotlin.jpa) apply false
    alias(libs.plugins.spring.boot) apply false
    alias(libs.plugins.spring.dependency.management) apply false
}

subprojects {
    apply(plugin = "org.jetbrains.kotlin.jvm")
    apply(plugin = "io.spring.dependency-management")

    group = "uz.kidscard"
    version = "0.1.0-SNAPSHOT"

    configure<JavaPluginExtension> {
        sourceCompatibility = JavaVersion.VERSION_21
        targetCompatibility = JavaVersion.VERSION_21
    }

    configure<io.spring.gradle.dependencymanagement.dsl.DependencyManagementExtension> {
        imports {
            mavenBom("org.springframework.boot:spring-boot-dependencies:3.4.1")
            mavenBom("org.springframework.cloud:spring-cloud-dependencies:2024.0.0")
        }
    }

    tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
        compilerOptions {
            freeCompilerArgs.addAll("-Xjsr305=strict", "-Xjvm-default=all")
            jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_21)
        }
    }

    tasks.withType<Test> {
        useJUnitPlatform()
        jvmArgs("-XX:+EnableDynamicAgentLoading")
        // Forward Docker env to forked test JVMs so Testcontainers finds the daemon
        // (no-op in CI with the standard socket; helps with OrbStack/Colima locally).
        listOf("DOCKER_HOST", "TESTCONTAINERS_RYUK_DISABLED", "TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE").forEach { key ->
            System.getenv(key)?.let { environment(key, it) }
        }
        // Optional: run against an external Postgres (e.g. local compose) instead of
        // Testcontainers by setting TEST_DB_URL — handy when the local Docker engine
        // is incompatible with Testcontainers' client API version.
        System.getenv("TEST_DB_URL")?.let { environment("TEST_DB_URL", it) }
    }
}
