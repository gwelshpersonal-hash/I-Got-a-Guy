import express from "express";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Stripe
  // Use lazy initialization or check if key exists
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  let stripe: Stripe | null = null;
  if (stripeKey) {
    stripe = new Stripe(stripeKey);
  } else {
    console.warn("STRIPE_SECRET_KEY is missing. Stripe integration will fail.");
  }

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Stripe Insurance Update Endpoint
  app.post('/api/provider/update-insurance', async (req, res) => {
    const { providerId, skill, status } = req.body;
    
    if (!stripe) {
      return res.status(500).json({ error: "Stripe is not configured on the server." });
    }

    // In a real app, you'd look up the stripeAccountId from your DB using providerId.
    // For this demo, we'll assume providerId IS the stripeAccountId or we have a mapping.
    // However, the user prompt says: "const stripeAccountId = await getStripeAccountId(providerId); // Lookup from your DB"
    // Since we don't have a real DB, we'll simulate this lookup or expect the frontend to send the stripeAccountId if available,
    // or just use a mock ID if we can't find one.
    // But wait, the user's code snippet uses `providerId` to look up `stripeAccountId`.
    // We'll assume the frontend sends the `stripeAccountId` as part of the body for simplicity in this demo,
    // OR we can just mock the update if we don't have a real Stripe account to update.
    
    // Let's try to do it properly if we can.
    // The frontend sends `providerId`.
    // We don't have access to the `users` array here easily without importing it from a shared file, 
    // but `users` is in `DataContext` (frontend state).
    // So we might need to pass `stripeAccountId` from the frontend.
    
    // Let's modify the frontend to send `stripeAccountId` as well, or just mock the lookup.
    // For now, I'll assume the `providerId` passed IS the `stripeAccountId` for the sake of the Stripe call,
    // or I'll just log it if I can't really call Stripe.
    
    // Actually, the user provided code:
    // const stripeAccountId = await getStripeAccountId(providerId);
    
    // I'll implement a mock lookup or expect it in the body.
    // Let's expect `stripeAccountId` in the body for now to make it work without a DB.
    
    const stripeAccountId = req.body.stripeAccountId; 

    if (!stripeAccountId) {
        return res.status(400).json({ error: "Stripe Account ID is required." });
    }

    try {
      await stripe.accounts.update(stripeAccountId, {
        metadata: {
          [`insurance_shield_${skill}`]: 'active',
          [`last_updated`]: Math.floor(Date.now() / 1000).toString()
        },
      });
      res.json({ success: true });
    } catch (err: any) {
      console.error("Stripe Update Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
