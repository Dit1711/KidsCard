rootProject.name = "kids-card"

pluginManagement {
    repositories {
        gradlePluginPortal()
        mavenCentral()
    }
}

dependencyResolutionManagement {
    repositories {
        mavenCentral()
    }
    versionCatalogs {
        create("libs") {
            from(files("gradle/libs.versions.toml"))
        }
    }
}

include(
    "libs:common",
    "services:api-gateway",
    "services:auth-service",
    "services:family-service",
    "services:card-service",
    "services:payment-service",
    "services:open-banking-service",
    "services:notification-service",
    "services:kyc-service",
)
