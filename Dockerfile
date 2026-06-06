# Single parameterized image for every JVM microservice.
#   docker build --build-arg SERVICE=payment-service -t kidscard/payment-service .
# syntax=docker/dockerfile:1

FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
ARG SERVICE
# Build inputs (everything the multi-project build needs).
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle ./gradle
COPY libs ./libs
COPY services ./services
# Cache the Gradle distribution + dependency cache across builds so we don't
# re-download Gradle from services.gradle.org every time (resilient to network
# blips on the build host). Survives image rebuilds on the same machine.
RUN --mount=type=cache,target=/root/.gradle \
    chmod +x gradlew && ./gradlew --no-daemon :services:${SERVICE}:bootJar

FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app
ARG SERVICE
RUN groupadd -r app && useradd -r -g app app
COPY --from=build /app/services/${SERVICE}/build/libs/*.jar app.jar
USER app
# Each service binds its own port via SERVER_PORT in compose.
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/app.jar"]
