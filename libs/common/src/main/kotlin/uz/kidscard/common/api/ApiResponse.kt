package uz.kidscard.common.api

import com.fasterxml.jackson.annotation.JsonInclude
import java.time.Instant
import java.util.UUID

@JsonInclude(JsonInclude.Include.NON_NULL)
data class ApiResponse<T>(
    val success: Boolean,
    val data: T? = null,
    val error: ApiError? = null,
    val requestId: String = UUID.randomUUID().toString(),
    val timestamp: Instant = Instant.now(),
) {
    companion object {
        fun <T> ok(data: T) = ApiResponse(success = true, data = data)
        fun <T> created(data: T) = ApiResponse(success = true, data = data)
        fun error(code: String, message: String) =
            ApiResponse<Nothing>(success = false, error = ApiError(code, message))
    }
}

data class ApiError(
    val code: String,
    val message: String,
    val details: List<String> = emptyList(),
)

data class PagedResponse<T>(
    val items: List<T>,
    val total: Long,
    val page: Int,
    val pageSize: Int,
    val totalPages: Int = ((total + pageSize - 1) / pageSize).toInt(),
)
