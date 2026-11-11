/**
 * Dominio puro de la Comisión Electoral de Facultad (Art. 41-48 / RGF-22).
 *
 * Art. 47: Las Comisiones Electorales a nivel de Facultad, Sede o Filial están
 * compuestas por un Presidente, un Vicepresidente y los representantes de las brigadas.
 */

export interface CommissionRepresentative {
  userId: string;
  name: string;
  brigadeCode: string;
}

export interface CommissionConstitutionParams {
  presidentUserId: string;
  vicePresidentUserId: string;
  representatives: CommissionRepresentative[];
  actaText: string;
  activeBrigadeCodes: readonly string[];
}

export interface CommissionValidationOutcome {
  valid: boolean;
  errors: string[];
}

/**
 * Valida la conformación y legalidad de la Comisión Electoral de la Facultad (Art. 47 / RGF-22).
 *
 * @param params datos de constitución de la Comisión
 */
export function validateCommissionConstitution(
  params: CommissionConstitutionParams,
): CommissionValidationOutcome {
  const errors: string[] = [];

  if (!params.presidentUserId) {
    errors.push("La Comisión debe tener un Presidente designado.");
  }

  if (!params.vicePresidentUserId) {
    errors.push("La Comisión debe tener un Vicepresidente designado.");
  }

  if (
    params.presidentUserId &&
    params.vicePresidentUserId &&
    params.presidentUserId === params.vicePresidentUserId
  ) {
    errors.push("El Presidente y el Vicepresidente de la Comisión deben ser personas distintas.");
  }

  if (!params.actaText || params.actaText.trim().length === 0) {
    errors.push("La constitución de la Comisión exige un acta formal registrada (RGF-22).");
  }

  // Verificar que cada brigada activa tenga al menos un representante (Art. 47)
  const representedBrigades = new Set(params.representatives.map((r) => r.brigadeCode.trim()));
  const missingBrigades = params.activeBrigadeCodes.filter((b) => !representedBrigades.has(b.trim()));

  if (missingBrigades.length > 0) {
    errors.push(
      `Faltan representantes de las siguientes brigadas activas en la Comisión: ${missingBrigades.join(", ")} (Art. 47).`,
    );
  }

  // Verificar que ningún usuario tenga doble asiento
  const userIds = [
    params.presidentUserId,
    params.vicePresidentUserId,
    ...params.representatives.map((r) => r.userId),
  ].filter(Boolean);

  const distinctUsers = new Set(userIds);
  if (distinctUsers.size !== userIds.length) {
    errors.push("Una persona no puede ocupar más de un cargo o representación en la Comisión.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
