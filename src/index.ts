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

    result.issues.forEach(({ path, message }) => {
      if (!path) return

      // Build nested object structure from path: ['user', 'address', 'street'] creates issues.user.address
      const container = path.slice(0, -1).reduce((currentLevel, key) => (currentLevel[String(key)] ??= {}), issues)

      // Store issues at the final key ('street' in the above example)
      const finalKey = String(path.at(-1))
      const fieldIssues = (container[finalKey] ??= [])
      fieldIssues.push(message)
    })

    return false
  }

  watch(data, () => Object.keys(issues).length && validate())

  return { validate, issues, clearIssues }
}
