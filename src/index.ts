import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { Object, Issues } from './types'
import { reactive, watch, toValue, type MaybeRefOrGetter } from 'vue'

export function useValidation<TData extends Object, TSchema = TData>(data: MaybeRefOrGetter<TData>, schema: StandardSchemaV1<TSchema>) {
  const issues = reactive<Issues<TData>>({})

  const clearIssues = () => Object.keys(issues).forEach((key) => delete issues[key])

  const validate = async () => {
    const result = await schema['~standard'].validate(toValue(data))
    clearIssues()

    if (!result.issues) return true

    for (const { path, message } of result.issues) {
      if (!path) continue

      // Create nesting: ['user', 'address', 'street'] creates issues.user.address
      let currentLevel = issues
      for (const key of path.slice(0, -1)) {
        currentLevel = currentLevel[String(key)] ??= {}
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
