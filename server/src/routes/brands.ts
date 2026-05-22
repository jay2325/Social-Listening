import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase";
import { z } from "zod";

export const brandsRouter = Router();

const CreateBrandSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "slug must be lowercase alphanumeric with dashes"),
  logo_url: z.string().url().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

const UpdateBrandSchema = CreateBrandSchema.partial();

/** GET /brands — list all active brands */
brandsRouter.get("/", async (_req: Request, res: Response): Promise<void> => {
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});

/** GET /brands/:id */
brandsRouter.get("/:id", async (req: Request, res: Response): Promise<void> => {
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error) {
    res.status(404).json({ error: "Brand not found" });
    return;
  }
  res.json(data);
});

/** POST /brands */
brandsRouter.post("/", async (req: Request, res: Response): Promise<void> => {
  const parse = CreateBrandSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten() });
    return;
  }

  const { data, error } = await supabase
    .from("brands")
    .insert(parse.data)
    .select()
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.status(201).json(data);
});

/** PATCH /brands/:id */
brandsRouter.patch("/:id", async (req: Request, res: Response): Promise<void> => {
  const parse = UpdateBrandSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten() });
    return;
  }

  const { data, error } = await supabase
    .from("brands")
    .update({ ...parse.data, updated_at: new Date().toISOString() })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.json(data);
});

/** DELETE /brands/:id  (soft delete) */
brandsRouter.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  const { error } = await supabase
    .from("brands")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", req.params.id);

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.status(204).send();
});
