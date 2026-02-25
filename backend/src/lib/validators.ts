/**
 * Zod validation schemas for API request bodies.
 * Centralized validation to prevent malformed/malicious inputs.
 */
import { z } from "zod";

// --- Auth schemas ---

export const registerSchema = z.object({
  email: z.string().email("Email inválido").max(255).transform(v => v.toLowerCase().trim()),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").max(128),
});

export const loginSchema = z.object({
  email: z.string().email("Email inválido").max(255).transform(v => v.toLowerCase().trim()),
  password: z.string().min(1, "Contraseña requerida").max(128),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email inválido").max(255).transform(v => v.toLowerCase().trim()),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token requerido").max(256),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").max(128),
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, "Contraseña actual requerida"),
  password: z.string().min(6, "La nueva contraseña debe tener al menos 6 caracteres").max(128),
});

export const updateProfileSchema = z.object({
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  phone: z.string().max(50).optional(),
  address_street: z.string().max(255).optional(),
  address_city: z.string().max(100).optional(),
  address_state: z.string().max(100).optional(),
  address_postal_code: z.string().max(20).optional(),
  address_country: z.string().max(100).optional(),
});

// --- Order schemas ---

const orderItemSchema = z.object({
  product_id: z.string().uuid().optional(),
  product: z.object({
    id: z.string().uuid(),
    name: z.string().max(255),
    price: z.number().positive(),
  }).optional(),
  product_name: z.string().max(255).optional(),
  name: z.string().max(255).optional(),
  price: z.number().nonnegative().optional(),
  quantity: z.number().int().positive().max(9999),
  selectedVariant: z.string().max(100).optional(),
  selected_variant: z.string().max(100).optional(),
}).passthrough();

export const createOrderSchema = z.object({
  customer_name: z.string().min(1, "Nombre requerido").max(255),
  customer_address: z.string().min(1, "Dirección requerida").max(500),
  customer_city: z.string().min(1, "Ciudad requerida").max(100),
  customer_postal_code: z.string().max(20).default(""),
  customer_phone: z.string().min(1, "Teléfono requerido").max(50),
  customer_email: z.string().email().max(255).optional().nullable(),
  items: z.array(orderItemSchema).min(1, "El pedido debe contener al menos un producto"),
  total: z.number().positive("El total debe ser positivo"),
  payment_method: z.enum(["card", "cash", "qr"]).default("card"),
  shipping_lat: z.number().min(-90).max(90).optional().nullable(),
  shipping_lng: z.number().min(-180).max(180).optional().nullable(),
  fiscal_data: z.record(z.string(), z.unknown()).optional().nullable(),
});

// --- Review schemas ---

export const createReviewSchema = z.object({
  product_id: z.string().uuid("ID de producto inválido"),
  user_name: z.string().min(1).max(255),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

// --- Contact schemas ---

export const contactSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(255),
  email: z.string().email("Email inválido").max(255),
  message: z.string().min(1, "Mensaje requerido").max(5000),
});

// --- Validation helper ---

import { Request, Response, NextFunction } from "express";

/**
 * Express middleware factory: validates req.body against a Zod schema.
 * On success, replaces req.body with the parsed (and transformed) data.
 * On failure, returns 400 with the first validation error.
 */
export function validate(schema: z.ZodType<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const firstError = result.error.issues[0];
      res.status(400).json({ error: firstError.message });
      return;
    }
    req.body = result.data;
    next();
  };
}
