import { reactive } from "vue"
import z from "zod"
import { useValidation } from "."

/**
 * Generates a union of all property keys from T.
 * If T is a union, produces a union of keys from all variants.
 * Example: `{ user, pass } | { code }` results in `'user' | 'pass' | 'code'`.
 */
type KeysOf<T> = T extends unknown ? keyof T : never

export type Object = Record<PropertyKey, unknown>

type ArrayOrObject = unknown[] | Object

export type Issues<TData> = {
  [TKey in KeysOf<TData>]?: TData[TKey] extends ArrayOrObject
    ? Issues<TData[TKey]> // if property value is object or array: recurse
    : string[] // else: array of messages
}

///

type Firts = { mode: 'login'; auth: { password: string } } | { mode: 'login'; auth: { code: string } }

const loginSchema = z.object({
  mode: z.literal('login'),
  auth: z.object({
    password: z.string().min(1, 'Password is required'),
  }),
})

const signupSchema = z.object({
  bert: z.literal('signup'),
  auth: z.object({
    code: z.string().length(6, 'Code is required'),
  }),
})

const authSchema = z.discriminatedUnion('mode', [loginSchema, signupSchema])

const form = reactive<Firts>({ mode: 'login', auth: { password: 'pass' } })

const { validate, issues } = useValidation(form, authSchema)

console.log(issues.auth?.code)
