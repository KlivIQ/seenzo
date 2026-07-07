import { z } from "zod";

export const scanSchema = z.object({
  name: z
    .string({ required_error: "Please enter your name" })
    .trim()
    .min(2, "Please enter your name")
    .max(80, "Name is too long"),
  business: z
    .string({ required_error: "Business name is required" })
    .trim()
    .min(2, "Business name is required")
    .max(120, "Business name is too long"),
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email")
    .max(160, "Email is too long"),
  phone: z
    .string({ required_error: "Phone number is required" })
    .trim()
    .min(1, "Phone number is required")
    .transform((v) => v.replace(/\s+/g, ""))
    .pipe(
      z
        .string()
        .min(7, "Enter a valid phone number")
        .max(20, "Phone number is too long")
        .regex(/^[+\d][\d\-()]*$/, "Digits only, may start with +"),
    ),
  website: z
    .string({ required_error: "Website URL is required" })
    .trim()
    .min(1, "Website URL is required")
    .transform((v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`))
    .pipe(
      z
        .string()
        .max(200, "URL is too long")
        .regex(/^https?:\/\/([\w-]+\.)+[\w-]{2,}(\/.*)?$/i, "Enter a valid website URL"),
    ),
});

export type ScanFormValues = z.infer<typeof scanSchema>;
