package uz.kidscard.family.repository

import org.springframework.data.jpa.repository.JpaRepository
import uz.kidscard.family.domain.Family
import java.util.UUID

interface FamilyRepository : JpaRepository<Family, UUID>
