import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.0.0";

const CREDITS_PER_PLAN: Record<string, number> = {
  starter: 500, pro: 3000, team: 10000, agency: 50000,
};

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature!, webhookSecret);
  } catch (e: any) {
    return new Response(`Webhook-Fehler: ${e.message}`, { status: 400 });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    switch (event.type) {

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.CheckoutSession;
        const userId = session.metadata?.user_id;
        if (!userId) break;

        if (session.metadata?.type === "credits") {
          // Credits aufbuchen
          const credits = parseInt(session.metadata.credits || "0");
          if (credits > 0) {
            await supabase.rpc("add_credits", {
              p_user_id: userId, p_amount: credits,
              p_transaction_type: "purchase",
              p_description: `${credits.toLocaleString("de-AT")} Credits gekauft`,
            });
            await supabase.from("credit_purchases").insert({
              user_id: userId, credits_bought: credits,
              amount_eur: (session.amount_total || 0) / 100,
              stripe_payment_intent_id: session.payment_intent as string,
              status: "completed",
            });
          }
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id;
        const planId = sub.metadata?.plan_id || "pro";
        if (!userId) break;

        await supabase.from("subscriptions").update({
          stripe_subscription_id: sub.id,
          plan_id: planId,
          status: sub.status,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }).eq("user_id", userId);

        await supabase.from("profiles").update({ plan: planId }).eq("id", userId);

        // Credits für neuen Monat
        if (event.type === "customer.subscription.updated") {
          const credits = CREDITS_PER_PLAN[planId] || 500;
          await supabase.rpc("add_credits", {
            p_user_id: userId, p_amount: credits,
            p_transaction_type: "subscription_renewal",
            p_description: `Monatliche Credits (${planId})`,
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id;
        if (!userId) break;
        await supabase.from("subscriptions").update({
          status: "cancelled", cancelled_at: new Date().toISOString(),
        }).eq("user_id", userId);
        await supabase.from("profiles").update({ plan: "starter" }).eq("id", userId);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        await supabase.from("subscriptions").update({ status: "past_due" })
          .eq("stripe_customer_id", customerId);
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("Webhook-Fehler:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});
