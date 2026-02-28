import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "E-mail je povinný.")
    .email("Zadejte platný e-mail."),
  password: z.string().min(1, "Heslo je povinné."),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  fullName: z
    .string()
    .min(2, "Jméno musí mít alespoň 2 znaky.")
    .max(100, "Jméno může mít maximálně 100 znaků."),
  email: z
    .string()
    .min(1, "E-mail je povinný.")
    .email("Zadejte platný e-mail."),
  password: z.string().min(8, "Heslo musí mít alespoň 8 znaků."),
});

export type SignupValues = z.infer<typeof signupSchema>;
