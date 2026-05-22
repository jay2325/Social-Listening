import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase";
import { z } from "zod";

export const trendsRouter = Router();

const BucketsQuerySchema = z.object({
  brand_id: z.string().uuid(),
  platform: z.string().default("twitter"),
  hours: z.coerce.number().int().min(1).max(168).default(168), // up to 7 days
});

/** GET /trends/buckets?brand_id=&hours=168 */
trendsRouter.get("/buckets", async (req: Request, res: Response): Promise<void> => {
  const parse = BucketsQuerySchema.safeParse(req.query);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten() });
    return;
  }

  const { brand_id, platform, hours } = parse.data;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("trend_buckets")
    .select("*")
    .eq("brand_id", brand_id)
    .eq("platform", platform)
    .gte("bucket_hour", since)
    .order("bucket_hour", { ascending: true });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});

/** GET /trends/spikes?brand_id= */
trendsRouter.get("/spikes", async (req: Request, res: Response): Promise<void> => {
  const brand_id = req.query.brand_id as string | undefined;
  const limit = Math.min(Number(req.query.limit ?? 20), 100);

  let query = supabase
    .from("trend_spikes")
    .select("*")
    .order("detected_at", { ascending: false })
    .limit(limit);

  if (brand_id) query = query.eq("brand_id", brand_id);

  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});
