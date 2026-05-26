package uz.kidscard.common.exception

import org.springframework.http.HttpStatus

open class BusinessException(
    val code: String,
    message: String,
    val httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
) : RuntimeException(message)

class ResourceNotFoundException(resource: String, id: Any) :
    BusinessException("${resource.uppercase()}_NOT_FOUND", "$resource with id=$id not found", HttpStatus.NOT_FOUND)

class AccessDeniedException(message: String = "Access denied") :
    BusinessException("ACCESS_DENIED", message, HttpStatus.FORBIDDEN)

class ConflictException(code: String, message: String) :
    BusinessException(code, message, HttpStatus.CONFLICT)

class ValidationException(message: String, val fields: Map<String, String> = emptyMap()) :
    BusinessException("VALIDATION_ERROR", message, HttpStatus.UNPROCESSABLE_ENTITY)
