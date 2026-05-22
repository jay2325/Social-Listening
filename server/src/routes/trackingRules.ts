import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase";
import { z } from "zod";

export const trackingRulesRouter = Router();

const CreateRuleSchema = z.object({
  brand_id: z.string().uuid(),
  platform: z.enum(["twitter"]).default("twitter"),
  rule_value: z.string().min(1).max(512),
});

const UpdateRuleSchema = CreateRuleSchema.partial().extend({
  is_active: z.boolean().optional(),
});

/** GET /tracking-rules?brand_id= */
trackingRulesRouter.get("/", async (req: Request, res: Response): Promise<void> => {
  const brand_id = req.query.brand_id as string | undefined;

  let query = supabase
    .from("tracking_rules")
    .select("*, brands(id, name, slug)")
    .order("created_at", { ascending: false });

  if (brand_id) query = query.eq("brand_id", brand_id);

  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});

/** POST /tracking-rules */
trackingRulesRouter.post("/", async (req: Request, res: Response): Promise<void> => {
  const parse = CreateRuleSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten() });
    return;
  }

  const { data, error } = await supabase
    .from("tracking_rules")
    .insert(parse.data)
    .select()
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.status(201).json(data);
});

/** PATCH /tracking-rules/:id */
trackingRulesRouter.patch("/:id", async (req: Request, res: Response): Promise<void> => {
  const parse = UpdateRuleSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten() });
    return;
  }

  const { data, error } = await supabase
    .from("tracking_rules")
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

/** DELETE /tracking-rules/:id */
trackingRulesRouter.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  const { error } = await supabase
    .from("tracking_rules")
    .delete()
    .eq("id", req.params.id);

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.status(204).send();
});
