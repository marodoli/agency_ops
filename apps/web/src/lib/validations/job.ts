import { z } from "zod";

export const jobLauncherSchema = z.object({
  client_id: z.string().min(1, "Vyberte klienta."),
  domain: z.string().min(1, "Doména je povinná."),
  crawl_depth: z.number().int().min(1).max(5),
  max_pages: z.number().int().min(10).max(500),
  custom_instructions: z
    .string()
    .max(2000, "Maximálně 2000 znaků.")
    .optional()
    .or(z.literal("")),
});

export type JobLauncherValues = z.infer<typeof jobLauncherSchema>;
