import type { StandardSchemaV1 } from '@standard-schema/spec'
import { reactive, watch, unref, type MaybeRef } from 'vue'

type Issues<T> = {
  [Key in keyof T]?: T[Key] extends object ? Issues<T[Key]> : string[]
}

export function useValidation<T extends Record<string, unknown>>(data: MaybeRef<T>, schema: StandardSchemaV1<T>) {
  const issues = reactive<Issues<T>>({})

  const clearIssues = () => Object.keys(issues).forEach((key) => delete issues[key])

  const validate = async () => {
    const result = await schema['~standard'].validate(unref(data))
    clearIssues()

    if (!result.issues) return true

    for (const { path, message } of result.issues) {
      if (!path) continue

      // Create nesting: ['user', 'address', 'street'] creates issues.user.address
      let currentLevel = issues
      for (const key of path.slice(0, -1)) {
        currentLevel[String(key)] ??= {}
        currentLevel = currentLevel[String(key)]
      }

      // Store issues at the final level ('street' in the above example)
      const fieldIssues = (currentLevel[String(path.at(-1))] ??= [])
      fieldIssues.push(message)
    }

    return false
  }

  watch(data, () => Object.keys(issues).length && validate())

  return { validate, issues, clearIssues }
}
