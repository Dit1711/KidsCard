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
