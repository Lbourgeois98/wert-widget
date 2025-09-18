// server.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import CryptoJS from "crypto-js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

const PARTNER_API_KEY = process.env.WERT_PARTNER_API_KEY;
const PARTNER_ID = process.env.WERT_PARTNER_ID;
const PRIVATE_KEY = process.env.WERT_PRIVATE_KEY;

if (!PARTNER_API_KEY || !PRIVATE_KEY || !PARTNER_ID) {
  console.error("❌ Missing env vars. Please set WERT_PARTNER_API_KEY, WERT_PRIVATE_KEY, WERT_PARTNER_ID");
  process.exit(1);
}

// 🔑 Helper: sign payload with private key
function signPayload(payload, privateKey) {
  return CryptoJS.HmacSHA256(JSON.stringify(payload), privateKey).toString();
}

// Endpoint: create Wert session
app.post("/api/create-wert-session", async (req, res) => {
  try {
    const { amount = 10, currency = "USD" } = req.body ?? {};

    const extra = {
      wallets: [
        {
          name: "TT",
          network: "amoy",
          address: "0x0118E8e2FCb391bCeb110F62b5B7B963477C1E0d",
        },
        {
          name: "ETH",
          network: "sepolia",
          address: "0x0118E8e2FCb391bCeb110F62b5B7B963477C1E0d",
        },
      ],
    };

    const payload = {
      partner_id: PARTNER_ID,
      origin: "https://sandbox.wert.io",
      amount,
      currency,
      extra,
    };

    // Sign the payload
    const signature = signPayload(payload, PRIVATE_KEY);

    // Send to Wert partner API
    const resp = await fetch("https://partner.wert.io/api/v1/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PARTNER_API_KEY}`,
      },
      body: JSON.stringify({ ...payload, signature }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("❌ Wert API error:", text);
      return res.status(resp.status).json({ error: text });
    }

    const data = await resp.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error", detail: String(err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
