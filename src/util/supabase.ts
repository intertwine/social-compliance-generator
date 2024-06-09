import { createClient } from "@supabase/supabase-js";
import { Database } from "../../types/supabase";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const getSupabaseClient = () => {
  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error("Missing required environment variables");
    }

    return createClient<Database>(SUPABASE_URL, SUPABASE_KEY);
  } catch (error: any) {
    console.error("Error getting Supabase client:", error);
    throw new Error("Failed to get Supabase client.");
  }
};

export { getSupabaseClient };