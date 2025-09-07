import { api, APIError } from "encore.dev/api";
import { secret } from "encore.dev/config";
import Stripe from "stripe";
import { authDB } from "../auth/db";
import jwt from "jsonwebtoken";

const stripeSecretKey = secret("StripeSecretKey");
const stripe = new Stripe(stripeSecretKey(), { apiVersion: "2024-06-20" });

export interface CreatePaymentIntentRequest {
  amount: number;
  currency: string;
  userToken: string;
}

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

export interface ConfirmDonationRequest {
  paymentIntentId: string;
  userToken: string;
}

export interface ConfirmDonationResponse {
  success: boolean;
  donationId: number;
}

// Creates a Stripe payment intent for donation
export const createPaymentIntent = api<CreatePaymentIntentRequest, CreatePaymentIntentResponse>(
  { expose: true, method: "POST", path: "/payments/stripe/create-intent" },
  async (req) => {
    if (req.amount < 5 || req.amount > 1000) {
      throw APIError.invalidArgument("Amount must be between $5 and $1000");
    }

    const decoded = verifyToken(req.userToken);

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(req.amount * 100), // Convert to cents
        currency: req.currency.toLowerCase(),
        metadata: {
          userId: decoded.userId.toString(),
        },
      });

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      throw APIError.internal("Failed to create payment intent");
    }
  }
);

// Confirms donation and records it in database
export const confirmDonation = api<ConfirmDonationRequest, ConfirmDonationResponse>(
  { expose: true, method: "POST", path: "/payments/stripe/confirm" },
  async (req) => {
    const decoded = verifyToken(req.userToken);

    try {
      // Retrieve payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(req.paymentIntentId);

      if (paymentIntent.status !== "succeeded") {
        throw APIError.failedPrecondition("Payment not completed");
      }

      // Record donation in database
      const donation = await authDB.queryRow<{ id: number }>`
        INSERT INTO donations (user_id, amount, currency, payment_provider, payment_id, status)
        VALUES (
          ${decoded.userId}, 
          ${paymentIntent.amount / 100}, 
          ${paymentIntent.currency.toUpperCase()}, 
          'stripe', 
          ${paymentIntent.id}, 
          'completed'
        )
        RETURNING id
      `;

      if (!donation) {
        throw APIError.internal("Failed to record donation");
      }

      // Grant access to general folder (folder_id = 1)
      await authDB.exec`
        INSERT INTO user_folder_access (user_id, folder_id)
        VALUES (${decoded.userId}, 1)
        ON CONFLICT (user_id, folder_id) DO NOTHING
      `;

      // Check if user qualifies for premium folders based on donation amount
      const donationAmount = paymentIntent.amount / 100;
      if (donationAmount >= 100) {
        // Grant access to premium folder (folder_id = 2)
        await authDB.exec`
          INSERT INTO user_folder_access (user_id, folder_id)
          VALUES (${decoded.userId}, 2)
          ON CONFLICT (user_id, folder_id) DO NOTHING
        `;
      }

      return {
        success: true,
        donationId: donation.id,
      };
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw APIError.internal("Failed to confirm donation");
    }
  }
);

function verifyToken(token: string): { userId: number; email: string } {
  try {
    const decoded = jwt.verify(token, "your-secret-key") as any;
    return { userId: decoded.userId, email: decoded.email };
  } catch (error) {
    throw APIError.unauthenticated("Invalid token");
  }
}
