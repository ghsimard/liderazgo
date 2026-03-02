/**
 * Convert gender-neutral role labels to gendered forms
 * based on the user's `genero` field from fichas_rlt.
 *
 * Stored values remain neutral ("Rector/a"), only display is adapted.
 */
export function genderizeRole(role: string | null | undefined, genero?: string | null): string {
  if (!role) return role ?? "";
  if (!genero) return role;

  const isMasc = genero.toLowerCase() === "masculino";
  const isFem = genero.toLowerCase() === "femenino";
  if (!isMasc && !isFem) return role;

  const replacements: [RegExp, string, string][] = [
    [/Rector\/a/g, "Rector", "Rectora"],
    [/rector\/a/g, "rector", "rectora"],
    [/Director\/a/g, "Director", "Directora"],
    [/director\/a/g, "director", "directora"],
    [/Coordinador\/a/g, "Coordinador", "Coordinadora"],
    [/coordinador\/a/g, "coordinador", "coordinadora"],
    [/Administrativo\(a\)/g, "Administrativo", "Administrativa"],
    [/administrativo\(a\)/g, "administrativo", "administrativa"],
    [/coordinador\(a\)/g, "coordinador", "coordinadora"],
    [/Coordinador\(a\)/g, "Coordinador", "Coordinadora"],
    [/Director\(a\)/g, "Director", "Directora"],
    [/director\(a\)/g, "director", "directora"],
    [/Rector\(a\)/g, "Rector", "Rectora"],
    [/rector\(a\)/g, "rector", "rectora"],
    [/Directivo/g, "Directivo", "Directiva"],
  ];

  let result = role;
  for (const [pattern, masc, fem] of replacements) {
    result = result.replace(pattern, isMasc ? masc : fem);
  }

  return result;
}
