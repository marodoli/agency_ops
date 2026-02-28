import { z } from "zod";

export const createClientSchema = z.object({
  name: z
    .string()
    .min(2, "Název musí mít alespoň 2 znaky.")
    .max(100, "Název může mít maximálně 100 znaků."),
  domain: z
    .string()
    .max(253, "Doména může mít maximálně 253 znaků.")
    .optional()
    .or(z.literal("")),
  brandVoice: z
    .string()
    .max(2000, "Brand voice může mít maximálně 2000 znaků.")
    .optional()
    .or(z.literal("")),
  notes: z
    .string()
    .max(5000, "Poznámky mohou mít maximálně 5000 znaků.")
    .optional()
    .or(z.literal("")),
});

export type CreateClientValues = z.infer<typeof createClientSchema>;

export const updateClientSchema = createClientSchema.extend({
  isActive: z.boolean().optional(),
});

export type UpdateClientValues = z.infer<typeof updateClientSchema>;
