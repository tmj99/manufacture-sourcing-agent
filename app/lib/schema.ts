import { z } from "zod";

export const anchorSchema = z.object({
  spec: z.string().min(10, "Describe the capability in at least 10 characters."),
  geography: z.string().optional(),
  certifications: z.string().optional(),
  volumeRange: z.string().optional(),
  excludeDomains: z.string().optional(),
});

export type Anchor = z.infer<typeof anchorSchema>;
