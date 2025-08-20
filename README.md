# ✅ Validation Composable

Lightweight, practical validation for Vue. [Only 80 lines of code](https://github.com/nexxtmove/validation-composable/blob/main/src/index.ts). No special components to wrap your forms. No proprietary schema syntax to learn. Just bring your favorite schema library and go.

🔌 Works with [Zod](https://www.npmjs.com/package/zod), [Yup](https://www.npmjs.com/package/yup), [Valibot](https://www.npmjs.com/package/valibot), and any other [Standard Schema](https://standardschema.dev/) library.

## Installation

```bash
npm i validation-composable
```

## Usage

```ts
import { useValidation } from 'validation-composable'

const { validate, issues } = useValidation(data, schema)
```

## Example

```vue
<script setup>
// Use your own data (Reactive, Ref, Pinia, etc.)
const data = reactive({
  subject: '',
  body: '',
})

// Use your favorite schema library
const schema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
})

// Pass the data and schema to the composable
const { validate, issues } = useValidation(data, schema)

// Validate before submission. It auto-validates on data changes.
async function send() {
  const valid = await validate()
  if (!valid) return

  …
}
</script>

<template>
  <form @submit="send">
    <input v-model="data.subject" :class="{ 'border-red': issues.subject }" />
    <span v-if="issues.subject">{{ issues.subject[0].message }}</span>

    <textarea v-model="data.body" :class="{ 'border-red': issues.body }" />
    <span v-if="issues.body">{{ issues.body[0].message }}</span>
  </form>
</template>
```

**💡 Pro Tip**: Consider creating reusable input components to display validation errors automatically. This eliminates repetition and ensures consistent styling across your forms.

## API

```ts
const { validate, issues, clearIssues } = useValidation(data, schema)
```

- `validate()`: validates and fills `issues`; returns true when valid
- `issues`: reactive object that mirrors your data; failing fields contain arrays of issues with `{ message, path }`
- `clearIssues()`: clears all issues
