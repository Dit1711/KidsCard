.PHONY: up down build test clean logs ps migrate

# Start all infrastructure (PostgreSQL, Redis, Kafka)
up:
	docker compose up -d
	@echo "Waiting for services to be healthy..."
	@docker compose wait postgres kafka redis || true
	@echo "Infrastructure ready. Kafka UI: http://localhost:8090 | MailHog: http://localhost:8025"

# Stop all infrastructure
down:
	docker compose down

# Stop and remove volumes (full reset)
reset:
	docker compose down -v

# Build all services
build:
	./gradlew build -x test

# Build without running tests (faster)
build-fast:
	./gradlew build -x test --parallel

# Run all tests
test:
	./gradlew test

# Run tests for a specific service (usage: make test-service SERVICE=family-service)
test-service:
	./gradlew :services:$(SERVICE):test

# Run a specific service locally (usage: make run SERVICE=family-service)
run:
	./gradlew :services:$(SERVICE):bootRun

# View logs for infrastructure
logs:
	docker compose logs -f $(filter-out $@,$(MAKECMDGOALS))

# Show running containers
ps:
	docker compose ps

# Clean build artifacts
clean:
	./gradlew clean

# Run database migrations for all services
migrate:
	./gradlew flywayMigrate

# Format Kotlin code
format:
	./gradlew ktlintFormat

# Check code style
lint:
	./gradlew ktlintCheck

# Generate Gradle wrapper (run once after clone)
wrapper:
	gradle wrapper --gradle-version=8.11.1

# Print help
help:
	@echo "Available targets:"
	@echo "  up           - Start infrastructure (Docker Compose)"
	@echo "  down         - Stop infrastructure"
	@echo "  reset        - Stop and remove all volumes (clean slate)"
	@echo "  build        - Build all services"
	@echo "  build-fast   - Build without tests"
	@echo "  test         - Run all tests"
	@echo "  test-service - Run tests for SERVICE=<name>"
	@echo "  run          - Run SERVICE=<name> locally"
	@echo "  logs         - Tail Docker Compose logs"
	@echo "  migrate      - Run DB migrations"
	@echo "  format       - Format Kotlin code"
	@echo "  wrapper      - Generate Gradle wrapper (run once)"
