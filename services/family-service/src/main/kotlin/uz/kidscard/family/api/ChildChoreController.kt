package uz.kidscard.family.api

import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestPart
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import uz.kidscard.common.api.ApiResponse
import uz.kidscard.common.exception.BusinessException
import uz.kidscard.family.api.dto.ChoreDto
import uz.kidscard.family.service.ChoreService
import uz.kidscard.family.service.ProofUpload
import java.util.UUID

/**
 * Child cabinet chore endpoints. Scoped to the JWT childId claim — a child can
 * only see and complete their own chores. Gated to ROLE_CHILD in SecurityConfig.
 */
@RestController
@RequestMapping("/api/v1/child/chores")
class ChildChoreController(
    private val choreService: ChoreService,
) {

    @GetMapping
    fun myChores(@AuthenticationPrincipal jwt: Jwt): ResponseEntity<ApiResponse<List<ChoreDto>>> {
        val childId = UUID.fromString(jwt.getClaimAsString("childId"))
        return ResponseEntity.ok(ApiResponse.ok(choreService.getChildChores(childId)))
    }

    /** Mark done. Sent as multipart so an optional proof photo can ride along. */
    @PostMapping("/{choreId}/complete", consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    fun complete(
        @PathVariable choreId: UUID,
        @RequestPart(value = "photo", required = false) photo: MultipartFile?,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ApiResponse<ChoreDto>> {
        val childId = UUID.fromString(jwt.getClaimAsString("childId"))
        return ResponseEntity.ok(ApiResponse.ok(choreService.childCompleteChore(choreId, childId, photo?.toProofUpload())))
    }

    /** The child can view the proof photo they submitted. */
    @GetMapping("/{choreId}/photo")
    fun photo(
        @PathVariable choreId: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ByteArray> {
        val childId = UUID.fromString(jwt.getClaimAsString("childId"))
        val img = choreService.getChildProofPhoto(choreId, childId) ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(img.contentType)).body(img.bytes)
    }
}

/** Validate an uploaded part is an image and normalize its extension. */
internal fun MultipartFile.toProofUpload(): ProofUpload {
    val ct = contentType ?: ""
    if (!ct.startsWith("image/")) {
        throw BusinessException("INVALID_PHOTO", "Можно загрузить только изображение")
    }
    val ext = when (ct.substringAfter('/').lowercase()) {
        "png" -> "png"
        "webp" -> "webp"
        "heic", "heif" -> "heic"
        "gif" -> "gif"
        else -> "jpg"
    }
    return ProofUpload(bytes, ext)
}
