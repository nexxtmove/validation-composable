/** Generates a union of all property keys from T, including keys from all union members when T is a union itself. */
type KeysOf<T> = T extends unknown ? keyof T : never

export type Issues<T> = {
  [K in KeysOf<T>]?: T[K] extends object
    ? Issues<T[K]> // if property value is object (or array): recurse
    : string[] // else: array of messages
}

export type AnyRecord = Record<PropertyKey, unknown>
