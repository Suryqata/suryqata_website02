import { json } from '@sveltejs/kit';
import { buildOrderFromSession, getStripeClient } from '$lib/server/stripe';

export async function GET({ url }) {
  const sessionId = String(url.searchParams.get('session_id') || '').trim();

  if (!sessionId) {
    return json({ error: 'Missing Stripe session id.' }, { status: 400 });
  }

  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer_details']
    });
    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
      limit: 100,
      expand: ['data.price.product']
    });

    if (session.payment_status !== 'paid') {
      return json({ error: 'Payment has not been confirmed yet.' }, { status: 409 });
    }

    return json({
      data: buildOrderFromSession(session, lineItems)
    });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'Unable to verify Stripe payment.' },
      { status: 500 }
    );
  }
}