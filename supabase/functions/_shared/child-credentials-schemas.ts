import { z } from 'npm:zod@3.23.8'

export const actionSchema = z.enum(['set_password', 'verify_password'])

export const childCredentialsRequestSchema = z.object({
  action: actionSchema,
  childId: z.string().uuid(),
  password: z.string().nullable()
})

export const childCredentialsResponseSchema = z.object({
  ok: z.boolean(),
  valid: z.boolean().optional()
})

export type ChildCredentialsRequest = z.infer<typeof childCredentialsRequestSchema>
export type ChildCredentialsResponse = z.infer<typeof childCredentialsResponseSchema>
