import { z } from "zod";

export const scanSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  business: z.string().trim().min(2, "Business name is required").max(120),
  email: z.string().trim().email("Enter a valid email").max(160),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number")
    .max(20)
    .regex(/^[+\d][\d\s\-()]*$/, "Digits only, may start with +"),
  website: z
    .string()
    .trim()
    .min(4, "Website URL is required")
    .max(200)
    .regex(/^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/i, "Enter a valid website URL"),
});

export type ScanFormValues = z.infer<typeof scanSchema>;