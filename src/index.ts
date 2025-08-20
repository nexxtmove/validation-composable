import type { StandardSchemaV1 } from '@standard-schema/spec'
import { reactive, watch, unref, type MaybeRef } from 'vue'

type Data = Record<string, unknown>

type Issues<T> = {
  [Key in keyof T]?: T[Key] extends object
    ? Issues<T[Key]>
    : StandardSchemaV1.Issue[]
}

export function useValidation<T extends Data>(
  data: MaybeRef<T>,
  schema: StandardSchemaV1<T>,
) {
  const issues = reactive<Issues<T>>({})

  /**
   * Validate the data against the schema.
   * Validation errors found will be stored in the `issues` object.
   */
  async function validate(): Promise<boolean> {
    const value = unref(data)
    const result = await schema['~standard'].validate(value)

    clearIssues()

    if (!result.issues) {
      return true
    }

    for (const issue of result.issues) {
      if (!issue.path) continue

      const leadingPath = issue.path.slice(0, -1)
      const finalProperty = issue.path[issue.path.length - 1]

      let current = issues

      // Create a nested object from the path
      for (const property of leadingPath) {
        const key = String(property)

        current[key] ??= {}
        current = current[key] // Set `current` to next nesting level, so the next property will be nested.
      }

      // Add the issue to the current nested object
      const finalKey = String(finalProperty)
      current[finalKey] ??= []
      current[finalKey].push(issue)
    }

    return false
  }

  /**
   * Clear validation issues.
   */
  function clearIssues() {
    for (const key of Object.keys(issues)) {
      delete issues[key]
    }
  }

  /**
   * Validate only if there are issues.
   */
  async function revalidate() {
    if (Object.keys(issues).length) {
      await validate()
    }
  }

  watch(data, revalidate)

  return { validate, issues, clearIssues }
}
