import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.0.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CREDIT_PACKAGES = [
  { credits: 1000,  price_eur: 9,   stripe_price_id: "price_credits_1000"  },
  { credits: 5000,  price_eur: 39,  stripe_price_id: "price_credits_5000"  },
  { credits: 20000, price_eur: 129, stripe_price_id: "price_credits_20000" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const { type, plan_id, credits_package, success_url, cancel_url } = await req.json();
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Nicht autorisiert");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) throw new Error("Nicht autorisiert");

    const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).single();
    const { data: subscription } = await supabase.from("subscriptions").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });

    // Stripe Customer erstellen oder wiederverwenden
    let customerId = subscription?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || profile?.email,
        name: profile?.full_name || undefined,
        metadata: { supabase_user_id: user.id },
        preferred_locales: ["de-AT", "de"],
      });
      customerId = customer.id;
      await supabase.from("subscriptions").update({ stripe_customer_id: customerId }).eq("user_id", user.id);
    }

    let session;

    if (type === "subscription") {
      // Abonnement-Checkout
      const { data: plan } = await supabase.from("plans").select("stripe_price_id, name_de, price_monthly").eq("id", plan_id).single();
      if (!plan?.stripe_price_id) throw new Error(`Kein Stripe-Preis für Plan: ${plan_id}`);

      session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        payment_method_types: ["card", "sepa_debit"],
        locale: "de",
        line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
        success_url: success_url || `${Deno.env.get("APP_URL")}/dashboard?checkout=success`,
        cancel_url: cancel_url || `${Deno.env.get("APP_URL")}/dashboard/billing`,
        subscription_data: {
          trial_period_days: 14,
          metadata: { user_id: user.id, plan_id },
        },
        metadata: { user_id: user.id, plan_id, type: "subscription" },
      });

    } else if (type === "credits") {
      // Credits kaufen
      const pkg = CREDIT_PACKAGES.find(p => p.credits === credits_package);
      if (!pkg) throw new Error("Ungültiges Credit-Paket");

      session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "payment",
        payment_method_types: ["card", "sepa_debit"],
        locale: "de",
        line_items: [{
          price_data: {
            currency: "eur",
            unit_amount: pkg.price_eur * 100,
            product_data: {
              name: `${pkg.credits.toLocaleString("de-AT")} EstateFlow Credits`,
              description: `Für KI-Exposé, Marktanalyse, Dokumentenprüfung und mehr`,
            },
          },
          quantity: 1,
        }],
        success_url: `${Deno.env.get("APP_URL")}/dashboard/billing?credits=success&amount=${pkg.credits}`,
        cancel_url: `${Deno.env.get("APP_URL")}/dashboard/billing`,
        metadata: { user_id: user.id, type: "credits", credits: pkg.credits.toString() },
      });
    } else {
      throw new Error("Ungültiger Checkout-Typ");
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
  }
});
