import { Stripe } from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing Stripe secret key");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
  typescript: true,
});

export const getStripeSession = async (
  priceId: string,
  userId: string,
  rankId: string
) => {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXTAUTH_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXTAUTH_URL}/shop`,
    metadata: {
      type: "rank_purchase",
      user_id: userId,
      rank_id: rankId,
    },
  });

  return session;
};
