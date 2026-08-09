import { z } from "zod";

const nameOrBusinessField = z
  .string({ required_error: "Please enter your name or business name" })
  .trim()
  .min(2, "Please enter your name or business name")
  .max(100, "That's too long — keep it under 100 characters");

const emailField = z
  .string({ required_error: "Email is required" })
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email")
  .max(160, "Email is too long");

// Optional: blank passes through untouched, only a non-blank value is
// validated as a phone number.
const phoneField = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v.replace(/\s+/g, "") : v))
  .refine((v) => !v || /^[+\d][\d\-()]*$/.test(v), {
    message: "Digits only, may start with +",
  })
  .refine((v) => !v || (v.length >= 7 && v.length <= 20), {
    message: "Enter a valid phone number",
  });

const websiteField = z
  .string({ required_error: "Website URL is required" })
  .trim()
  .min(1, "Website URL is required")
  .transform((v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`))
  .pipe(
    z
      .string()
      .max(200, "URL is too long")
      .regex(/^https?:\/\/([\w-]+\.)+[\w-]{2,}(\/.*)?$/i, "Enter a valid website URL"),
  );

/**
 * Client-facing form schema — a single "Name / Business name" field.
 * The submit handler duplicates its value into both `name` and `business`
 * for the wire payload validated by `scanSchema` below.
 */
export const scanFormSchema = z.object({
  nameOrBusiness: nameOrBusinessField,
  email: emailField,
  phone: phoneField,
  website: websiteField,
});

export type ScanFormValues = z.infer<typeof scanFormSchema>;

/** Server-facing schema — validates the { name, business, email, phone, website } wire payload. */
export const scanSchema = z.object({
  name: nameOrBusinessField,
  business: nameOrBusinessField,
  email: emailField,
  phone: phoneField,
  website: websiteField,
});

export type ScanRequestValues = z.infer<typeof scanSchema>;
