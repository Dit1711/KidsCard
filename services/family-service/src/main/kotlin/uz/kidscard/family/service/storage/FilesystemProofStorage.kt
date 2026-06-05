package uz.kidscard.family.service.storage

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.nio.file.Files
import java.nio.file.Path

/**
 * Stores chore proof photos on a local directory (mounted as a Docker volume),
 * keeping data on the server in-country. Swap this bean for an S3/MinIO
 * implementation of [ProofStorage] when scaling — nothing else changes.
 */
@Component
class FilesystemProofStorage(
    @Value("\${app.storage.proof-dir:/data/proofs}") private val dir: String,
) : ProofStorage {
    private val log = LoggerFactory.getLogger(javaClass)
    private val root: Path = Path.of(dir)

    init {
        Files.createDirectories(root)
        log.info("Proof photo storage at {}", root.toAbsolutePath())
    }

    override fun store(key: String, bytes: ByteArray) {
        Files.write(resolve(key), bytes)
    }

    override fun load(key: String): ByteArray? {
        val path = resolve(key)
        return if (Files.exists(path)) Files.readAllBytes(path) else null
    }

    override fun delete(key: String) {
        Files.deleteIfExists(resolve(key))
    }

    /** Resolve a key to a path inside [root], guarding against path traversal. */
    private fun resolve(key: String): Path {
        val safe = Path.of(key).fileName.toString()
        return root.resolve(safe)
    }
}
