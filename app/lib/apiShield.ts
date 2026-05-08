/**
 * API-BOLA-AND-MASS-ASSIGNMENT-BLOCKER (Frontend API Guard)
 * 
 * Bu modül, Next.js API route'larına gelen body'leri filtreleyerek
 * sadece izin verilen (Allowlist) alanların işlenmesini sağlar.
 */

/**
 * Mass Assignment Protection:
 * Body içinden sadece izin verilen anahtarları süzerek yeni bir nesne döner.
 */
export function protectMassAssignment<T extends object>(
    body: any,
    allowedFields: (keyof T)[]
): Partial<T> {
    const sanitized: Partial<T> = {};
    
    for (const field of allowedFields) {
        if (Object.prototype.hasOwnProperty.call(body, field)) {
            sanitized[field] = body[field];
        }
    }
    
    // Güvenlik: Eğer body içinde yasaklı alanlar varsa logla
    const forbiddenFields = ['role', 'isAdmin', 'isStaff', 'balance', 'permissions'];
    for (const f of forbiddenFields) {
        if (body[f] !== undefined) {
            console.warn(`[SECURITY-ALERT] Mass Assignment girişimi engellendi! Alan: ${f}, Değer: ${body[f]}`);
        }
    }

    return sanitized;
}

/**
 * BOLA Check Helper:
 * İşlem yapılmak istenen kaynağın kullanıcıya ait olup olmadığını doğrular.
 */
export function verifyOwnership(resourceUserId: string | number, currentUserId: string | number): boolean {
    if (!resourceUserId || !currentUserId) return false;
    return resourceUserId.toString() === currentUserId.toString();
}
