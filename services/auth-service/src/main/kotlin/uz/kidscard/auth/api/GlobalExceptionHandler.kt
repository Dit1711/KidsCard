package uz.kidscard.auth.api

import org.slf4j.LoggerFactory
import org.springframework.http.ResponseEntity
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import uz.kidscard.common.api.ApiError
import uz.kidscard.common.api.ApiResponse
import uz.kidscard.common.exception.BusinessException

@RestControllerAdvice
class GlobalExceptionHandler {

    private val log = LoggerFactory.getLogger(javaClass)

    @ExceptionHandler(BusinessException::class)
    fun handleBusiness(ex: BusinessException): ResponseEntity<ApiResponse<Nothing>> {
        log.warn("Business exception: code={} message={}", ex.code, ex.message)
        return ResponseEntity
            .status(ex.httpStatus)
            .body(ApiResponse.error(ex.code, ex.message ?: "Error"))
    }

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidation(ex: MethodArgumentNotValidException): ResponseEntity<ApiResponse<Nothing>> {
        val fields = ex.bindingResult.fieldErrors.associate { it.field to (it.defaultMessage ?: "Invalid") }
        val error = ApiError(
            code = "VALIDATION_ERROR",
            message = "Request validation failed",
            details = fields.map { "${it.key}: ${it.value}" },
        )
        return ResponseEntity.unprocessableEntity().body(ApiResponse(success = false, error = error))
    }

    @ExceptionHandler(InvalidBearerTokenException::class)
    fun handleInvalidBearerToken(ex: InvalidBearerTokenException): ResponseEntity<ApiResponse<Nothing>> {
        log.debug("Invalid bearer token: {}", ex.message)
        return ResponseEntity
            .status(401)
            .body(ApiResponse.error("INVALID_TOKEN", "Invalid or expired access token."))
    }

    @ExceptionHandler(Exception::class)
    fun handleUnexpected(ex: Exception): ResponseEntity<ApiResponse<Nothing>> {
        log.error("Unexpected error", ex)
        return ResponseEntity
            .internalServerError()
            .body(ApiResponse.error("INTERNAL_ERROR", "Internal server error"))
    }
}
