import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase";

export const mentionsRouter = Router();

/** GET /mentions?brand_id=&limit=&cursor=&label= */
mentionsRouter.get("/", async (req: Request, res: Response): Promise<void> => {
  const brand_id = req.query.brand_id as string | undefined;
  const limit = Math.min(Number(req.query.limit ?? 50), 100);
  const cursor = req.query.cursor as string | undefined; // ISO timestamp for keyset pagination
  const label = req.query.label as string | undefined;  // positive | neutral | negative

  let query = supabase
    .from("mentions")
    .select(
      `
      *,
      authors (*),
      mention_sentiment (score, label, model_version)
    `
    )
    .order("posted_at", { ascending: false })
    .limit(limit);

  if (brand_id) query = query.eq("brand_id", brand_id);
  if (cursor) query = query.lt("posted_at", cursor);
  if (label) {
    // Filter through sentiment join — Supabase PostgREST syntax
    query = query.eq("mention_sentiment.label", label);
  }

  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});

/** GET /mentions/:id */
mentionsRouter.get("/:id", async (req: Request, res: Response): Promise<void> => {
  const { data, error } = await supabase
    .from("mentions")
    .select("*, authors(*), mention_sentiment(*)")
    .eq("id", req.params.id)
    .single();

  if (error) {
    res.status(404).json({ error: "Mention not found" });
    return;
  }
  res.json(data);
});
