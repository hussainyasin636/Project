export interface SlugValidationResult {
  isValid: boolean
  error?: string
}

export const SLUG_MIN_LENGTH = 2
export const SLUG_MAX_LENGTH = 50
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function validateSlug(
  slug: string,
  existingSlugs: string[] = []
): SlugValidationResult {
  if (!slug) {
    return {
      isValid: false,
      error: "Project name must contain letters or numbers to generate a slug.",
    }
  }

  if (slug.length < SLUG_MIN_LENGTH) {
    return {
      isValid: false,
      error: `Slug must be at least ${SLUG_MIN_LENGTH} characters long.`,
    }
  }

  if (slug.length > SLUG_MAX_LENGTH) {
    return {
      isValid: false,
      error: `Slug cannot exceed ${SLUG_MAX_LENGTH} characters.`,
    }
  }

  if (!SLUG_REGEX.test(slug)) {
    return {
      isValid: false,
      error: "Slug can only contain lowercase alphanumeric characters and hyphens.",
    }
  }

  const isDuplicate = existingSlugs.some(
    (existing) => existing.toLowerCase() === slug.toLowerCase()
  )

  if (isDuplicate) {
    return {
      isValid: false,
      error: "This slug is already taken. Please choose a different name.",
    }
  }

  return { isValid: true }
}
