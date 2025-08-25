import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import { reactive, ref, nextTick } from 'vue'
import { useValidation } from '../src/index'

describe('useValidation', () => {
  describe('basic validation', () => {
    it('should return valid result for valid data', async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      })

      const data = reactive({
        name: 'John',
        age: 30,
      })

      const { validate, issues } = useValidation(data, schema)
      const isValid = await validate()

      expect(isValid).toBe(true)
      expect(Object.keys(issues)).toHaveLength(0)
    })

    it('should return invalid result and populate issues for invalid data', async () => {
      const schema = z.object({
        name: z.string().min(1), // Make sure empty string fails
        age: z.number(),
      })

      const data = reactive({
        name: '',
        age: 'not a number' as any,
      })

      const { validate, issues } = useValidation(data, schema)
      const isValid = await validate()

      expect(isValid).toBe(false)
      expect(issues.name).toBeDefined()
      expect(issues.age).toBeDefined()
      expect(Array.isArray(issues.name)).toBe(true)
      expect(Array.isArray(issues.age)).toBe(true)
    })

    it('should work with ref objects', async () => {
      const schema = z.object({
        email: z.email(),
      })

      const data = ref({
        email: 'invalid-email',
      })

      const { validate, issues } = useValidation(data, schema)
      const isValid = await validate()

      expect(isValid).toBe(false)
      expect(issues.email).toBeDefined()
      expect(Array.isArray(issues.email)).toBe(true)
    })
  })

  describe('nested object validation', () => {
    it('should handle nested object validation errors', async () => {
      const schema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string().min(2),
            age: z.number().min(0),
          }),
          settings: z.object({
            theme: z.enum(['light', 'dark']),
          }),
        }),
      })

      const data = reactive({
        user: {
          profile: {
            name: 'A', // Too short
            age: -5, // Negative
          },
          settings: {
            theme: 'invalid' as any, // Not in enum
          },
        },
      })

      const { validate, issues } = useValidation(data, schema)
      const isValid = await validate()

      expect(isValid).toBe(false)
      expect(issues.user?.profile?.name).toBeDefined()
      expect(issues.user?.profile?.age).toBeDefined()
      expect(issues.user?.settings?.theme).toBeDefined()
    })

    it('should handle deeply nested validation errors', async () => {
      const schema = z.object({
        level1: z.object({
          level2: z.object({
            level3: z.object({
              value: z.string().min(5),
            }),
          }),
        }),
      })

      const data = reactive({
        level1: {
          level2: {
            level3: {
              value: 'abc', // Too short
            },
          },
        },
      })

      const { validate, issues } = useValidation(data, schema)
      const isValid = await validate()

      expect(isValid).toBe(false)
      expect(issues.level1?.level2?.level3?.value).toBeDefined()
      expect(Array.isArray(issues.level1?.level2?.level3?.value)).toBe(true)
    })
  })

  describe('array validation', () => {
    it('should handle array validation errors', async () => {
      const schema = z.object({
        items: z.array(
          z.object({
            id: z.number(),
            name: z.string().min(2),
          }),
        ),
      })

      const data = reactive({
        items: [
          { id: 1, name: 'Valid' },
          { id: 'invalid' as any, name: 'A' }, // Invalid id and name too short
          { id: 3, name: 'Valid Again' },
        ],
      })

      const { validate, issues } = useValidation(data, schema)
      const isValid = await validate()

      expect(isValid).toBe(false)
      expect(issues.items).toBeDefined()
    })
  })

  describe('issue management', () => {
    it('should clear previous issues on new validation', async () => {
      const schema = z.object({
        name: z.string().min(2),
      })

      // Create a reactive data object that we can modify
      const data = reactive({ name: 'A' }) // Invalid

      const { validate, issues } = useValidation(data, schema)

      // First validation - should have issues
      let isValid = await validate()
      expect(isValid).toBe(false)
      expect(issues.name).toBeDefined()

      // Fix the data - this demonstrates real reactivity
      data.name = 'Valid Name'

      // Second validation - should clear issues
      isValid = await validate()
      expect(isValid).toBe(true)
      expect(Object.keys(issues)).toHaveLength(0)
    })

    it('should handle issues without path gracefully', async () => {
      // Create a mock schema that returns issues without paths
      const mockSchema = {
        '~standard': {
          version: 1,
          vendor: 'test',
          validate: vi.fn().mockResolvedValue({
            issues: [
              {
                message: 'Global error',
                // No path property
              },
            ],
          }),
        },
      }

      const data = reactive({ test: 'value' })
      const { validate, issues } = useValidation(data, mockSchema as any)

      const isValid = await validate()

      expect(isValid).toBe(false)
      expect(Object.keys(issues)).toHaveLength(0) // No issues should be added since there's no path
    })
  })

  describe('edge cases', () => {
    it('should handle empty objects', async () => {
      const schema = z.object({})
      const data = reactive({})

      const { validate, issues } = useValidation(data, schema)
      const isValid = await validate()

      expect(isValid).toBe(true)
      expect(Object.keys(issues)).toHaveLength(0)
    })

    it('should handle schema validation that returns no issues', async () => {
      const mockSchema = {
        '~standard': {
          version: 1,
          vendor: 'test',
          validate: vi.fn().mockResolvedValue({
            // No issues property
          }),
        },
      }

      const data = reactive({ test: 'value' })
      const { validate, issues } = useValidation(data, mockSchema as any)

      const isValid = await validate()

      expect(isValid).toBe(true)
      expect(Object.keys(issues)).toHaveLength(0)
    })

    it('should handle multiple issues for the same field', async () => {
      const schema = z.object({
        password: z
          .string()
          .min(8, 'Password must be at least 8 characters')
          .regex(/[A-Z]/, 'Password must contain an uppercase letter')
          .regex(/[0-9]/, 'Password must contain a number'),
      })

      const data = reactive({
        password: 'abc', // Fails all validation rules
      })

      const { validate, issues } = useValidation(data, schema)
      const isValid = await validate()

      expect(isValid).toBe(false)
      expect(issues.password).toBeDefined()
      expect(Array.isArray(issues.password)).toBe(true)
      expect(issues.password?.length).toBeGreaterThan(1)
    })

    it('should handle complex paths with array indices', async () => {
      const schema = z.object({
        users: z.array(
          z.object({
            contacts: z.array(
              z.object({
                email: z.email(),
              }),
            ),
          }),
        ),
      })

      const data = reactive({
        users: [
          {
            contacts: [
              { email: 'valid@email.com' },
              { email: 'invalid-email' }, // Invalid email at path: users.0.contacts.1.email
            ],
          },
        ],
      })

      const { validate, issues } = useValidation(data, schema)
      const isValid = await validate()

      expect(isValid).toBe(false)
      expect(issues.users).toBeDefined()
    })

    it('should handle null and undefined values gracefully', async () => {
      const schema = z.object({
        optional: z.string().optional(),
        nullable: z.string().nullable(),
        required: z.string(),
      })

      const data = reactive({
        optional: undefined,
        nullable: null,
        required: null,
      } as any)

      const { validate, issues } = useValidation(data, schema)
      const isValid = await validate()

      expect(isValid).toBe(false)
      expect(issues.required).toBeDefined() // Should have error for required field
    })

    it('should handle very deep nesting', async () => {
      const schema = z.object({
        a: z.object({
          b: z.object({
            c: z.object({
              d: z.object({
                e: z.string().min(5),
              }),
            }),
          }),
        }),
      })

      const data = reactive({
        a: {
          b: {
            c: {
              d: {
                e: 'abc', // Too short
              },
            },
          },
        },
      })

      const { validate, issues } = useValidation(data, schema)
      const isValid = await validate()

      expect(isValid).toBe(false)
      expect(issues.a?.b?.c?.d?.e).toBeDefined()
    })

    it('should work with getter functions', async () => {
      const schema = z.object({
        username: z.string().min(3),
      })

      let value = { username: 'ab' } // Invalid
      const getter = () => value

      const { validate, issues } = useValidation(getter, schema)
      let isValid = await validate()
      expect(isValid).toBe(false)
      expect(issues.username).toBeDefined()

      value = { username: 'validUser' } // Valid
      isValid = await validate()
      expect(isValid).toBe(true)
      expect(Object.keys(issues)).toHaveLength(0)
    })
  })

  describe('type safety', () => {
    it('should maintain type safety for issues object', async () => {
      const schema = z.object({
        name: z.string().min(1),
        age: z.number(),
        address: z.object({
          street: z.string().min(1),
          city: z.string().min(1),
        }),
      })

      const data = reactive({
        name: '',
        age: 'invalid' as any,
        address: {
          street: '',
          city: '',
        },
      })

      const { validate, issues } = useValidation(data, schema)
      await validate()

      // These should be type-safe accesses
      expect(issues.name).toBeDefined()
      expect(issues.age).toBeDefined()
      expect(issues.address?.street).toBeDefined()
      expect(issues.address?.city).toBeDefined()
    })
  })

  describe('clearIssues function', () => {
    it('should clear all validation issues', async () => {
      const schema = z.object({
        name: z.string().min(2),
        age: z.number(),
        address: z.object({
          street: z.string().min(1),
          city: z.string().min(1),
        }),
      })

      const data = reactive({
        name: 'A', // Invalid - too short
        age: 'invalid' as any, // Invalid - not a number
        address: {
          street: '', // Invalid - empty
          city: '', // Invalid - empty
        },
      })

      const { validate, issues, clearIssues } = useValidation(data, schema)

      // First validation - should have issues
      const isValid = await validate()
      expect(isValid).toBe(false)
      expect(issues.name).toBeDefined()
      expect(issues.age).toBeDefined()
      expect(issues.address?.street).toBeDefined()
      expect(issues.address?.city).toBeDefined()
      expect(Object.keys(issues).length).toBeGreaterThan(0)

      // Clear issues manually
      clearIssues()

      // Should have no issues after clearing
      expect(Object.keys(issues)).toHaveLength(0)
      expect(issues.name).toBeUndefined()
      expect(issues.age).toBeUndefined()
      expect(issues.address).toBeUndefined()
    })

    it('should work when there are no issues to clear', () => {
      const schema = z.object({
        name: z.string(),
      })

      const data = reactive({ name: 'Valid Name' })

      const { issues, clearIssues } = useValidation(data, schema)

      // Initially no issues
      expect(Object.keys(issues)).toHaveLength(0)

      // Clear should work without errors even when there are no issues
      expect(() => clearIssues()).not.toThrow()
      expect(Object.keys(issues)).toHaveLength(0)
    })

    it('should be called automatically during validation', async () => {
      const schema = z.object({
        name: z.string().min(2),
      })

      const data = reactive({ name: 'A' }) // Invalid

      const { validate, issues } = useValidation(data, schema)

      // First validation - should have issues
      let isValid = await validate()
      expect(isValid).toBe(false)
      expect(issues.name).toBeDefined()

      // Modify data to be valid
      data.name = 'Valid Name'

      // Second validation - clear should be called automatically
      isValid = await validate()
      expect(isValid).toBe(true)
      expect(Object.keys(issues)).toHaveLength(0)
    })
  })

  describe('error messages', () => {
    it('should capture custom error messages from validation', async () => {
      const schema = z.object({
        subject: z.string().min(1, 'Subject is required'),
        email: z.string().email('Please enter a valid email address'),
        age: z.number().min(18, 'You must be at least 18 years old'),
        password: z
          .string()
          .min(8, 'Password must be at least 8 characters')
          .regex(/[A-Z]/, 'Password must contain an uppercase letter'),
      })

      const data = reactive({
        subject: '',
        email: 'invalid-email',
        age: 16,
        password: 'weak',
      })

      const { validate, issues } = useValidation(data, schema)
      const isValid = await validate()

      expect(isValid).toBe(false)

      // Check that custom error messages are captured
      expect(issues.subject).toBeDefined()
      expect(issues.subject?.[0]).toBe('Subject is required')

      expect(issues.email).toBeDefined()
      expect(issues.email?.[0]).toBe('Please enter a valid email address')

      expect(issues.age).toBeDefined()
      expect(issues.age?.[0]).toBe('You must be at least 18 years old')

      expect(issues.password).toBeDefined()
      expect(issues.password?.length).toBeGreaterThan(0)

      // Check that multiple error messages are captured for password
      expect(issues.password).toContain('Password must be at least 8 characters')
      expect(issues.password).toContain('Password must contain an uppercase letter')
    })

    it('should capture error messages for nested objects', async () => {
      const schema = z.object({
        user: z.object({
          profile: z.object({
            firstName: z.string().min(1, 'First name is required'),
            lastName: z.string().min(1, 'Last name is required'),
          }),
          contact: z.object({
            email: z.string().email('Invalid email format'),
            phone: z.string().min(10, 'Phone number must be at least 10 digits'),
          }),
        }),
      })

      const data = reactive({
        user: {
          profile: {
            firstName: '',
            lastName: '',
          },
          contact: {
            email: 'not-an-email',
            phone: '123',
          },
        },
      })

      const { validate, issues } = useValidation(data, schema)
      const isValid = await validate()

      expect(isValid).toBe(false)

      // Check nested error messages
      expect(issues.user?.profile?.firstName?.[0]).toBe('First name is required')
      expect(issues.user?.profile?.lastName?.[0]).toBe('Last name is required')
      expect(issues.user?.contact?.email?.[0]).toBe('Invalid email format')
      expect(issues.user?.contact?.phone?.[0]).toBe('Phone number must be at least 10 digits')
    })

    it('should capture error messages for array items', async () => {
      const schema = z.object({
        items: z
          .array(
            z.object({
              name: z.string().min(2, 'Item name must be at least 2 characters'),
              price: z.number().min(0, 'Price must be positive'),
            }),
          )
          .min(1, 'At least one item is required'),
      })

      const data = reactive({
        items: [
          { name: 'A', price: -5 }, // Both invalid
          { name: 'Valid Item', price: 10 }, // Valid
          { name: '', price: -1 }, // Both invalid
        ],
      })

      const { validate, issues } = useValidation(data, schema)
      const isValid = await validate()

      expect(isValid).toBe(false)
      expect(issues.items).toBeDefined()

      // Check that error messages are available in the issues structure
      const issuesJson = JSON.stringify(issues)
      expect(issuesJson).toContain('Item name must be at least 2 characters')
      expect(issuesJson).toContain('Price must be positive')
    })

    it('should handle default error messages when no custom message is provided', async () => {
      const schema = z.object({
        email: z.string().email(), // No custom message
        age: z.number().min(18), // No custom message
      })

      const data = reactive({
        email: 'invalid-email',
        age: 16,
      })

      const { validate, issues } = useValidation(data, schema)
      const isValid = await validate()

      expect(isValid).toBe(false)

      // Should have default Zod error messages
      expect(issues.email).toBeDefined()
      expect(issues.email?.[0]).toBeDefined()
      expect(typeof issues.email?.[0]).toBe('string')

      expect(issues.age).toBeDefined()
      expect(issues.age?.[0]).toBeDefined()
      expect(typeof issues.age?.[0]).toBe('string')
    })
  })

  describe('reactive behavior', () => {
    it('should automatically revalidate when reactive data changes', async () => {
      const schema = z.object({
        email: z.email(),
      })

      const data = reactive({
        email: 'invalid-email', // Start with invalid data
      })

      const { validate, issues } = useValidation(data, schema)

      // Initial validation - should be invalid and populate issues
      let isValid = await validate()
      expect(isValid).toBe(false)
      expect(issues.email).toBeDefined()

      // Make the email valid - should automatically clear issues
      data.email = 'valid@email.com'

      // Wait for the next tick to allow the watcher to run
      await nextTick()

      expect(Object.keys(issues)).toHaveLength(0)
    })

    it('should work with ref objects and handle value changes', async () => {
      const schema = z.object({
        count: z.number().min(0),
      })

      const data = ref({
        count: 5,
      })

      const { validate, issues } = useValidation(data, schema)

      // Initial validation
      let isValid = await validate()
      expect(isValid).toBe(true)

      // Change the ref value to something invalid
      data.value = { count: -1 }

      isValid = await validate()
      expect(isValid).toBe(false)
      expect(issues.count).toBeDefined()
    })
  })
})
