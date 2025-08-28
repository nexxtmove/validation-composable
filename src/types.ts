type Combine<T, K extends PropertyKey = T extends unknown ? keyof T : never> = T extends unknown
  ? T & Partial<Record<Exclude<K, keyof T>, never>>
  : never

export type Issues<T> = {
  [Key in keyof Combine<T>]?: Combine<T>[Key] extends object ? Issues<Combine<T>[Key]> : string[]
}
