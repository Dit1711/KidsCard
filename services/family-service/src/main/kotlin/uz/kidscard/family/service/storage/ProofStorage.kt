package uz.kidscard.family.service.storage

/**
 * Storage for chore proof photos. Abstracted so the backend (local filesystem
 * volume today, S3/MinIO later) can be swapped without touching the chore flow.
 * Keys are flat, opaque filenames.
 */
interface ProofStorage {
    fun store(key: String, bytes: ByteArray)
    fun load(key: String): ByteArray?
    fun delete(key: String)
}
