/** Generate a union of all property keys from T, including keys from all members when T is a union itself. */
type KeysOf<T> = T extends unknown ? keyof T : never

/** Pick property type for a possibly missing key */
type PropType<T, K extends PropertyKey> = T extends { [P in K]?: unknown } ? T[K] : never

/** Nested record of issue message arrays */
export type Issues<T> = {
  [K in KeysOf<T>]?: PropType<T, K> extends object
    ? Issues<PropType<T, K>> // if property type is object (or array): recurse
    : string[] // else: array of messages
}

/** Any record with unknown value type */
export type AnyRecord = Record<PropertyKey, unknown>
