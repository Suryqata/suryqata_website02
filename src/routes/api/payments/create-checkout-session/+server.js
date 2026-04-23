import { json } from '@sveltejs/kit';
import { buildOrderMetadata, buildStripeLineItems, getStripeClient, normalizeCheckoutCart } from '$lib/server/stripe';

export async function POST({ request, url }) {
  const body = await request.json().catch(() => ({}));
  const cart = normalizeCheckoutCart(body?.cart);
  const formData = body?.formData || {};

  if (!cart.length) {
    return json({ error: 'Your cart is empty.' }, { status: 400 });
  }

  try {
    const stripe = getStripeClient();
    const successUrl = new URL('/thank-you.html', url);
    const cancelUrl = new URL('/checkout.html', url);

    successUrl.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}');

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: successUrl.toString(),
      cancel_url: cancelUrl.toString(),
      customer_email: String(formData.email || '').trim() || undefined,
      payment_method_types: ['card'],
      line_items: buildStripeLineItems(cart),
      metadata: buildOrderMetadata(formData)
    });

    return json({
      data: {
        id: session.id,
        url: session.url || ''
      }
    });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'Unable to start Stripe checkout.' },
      { status: 500 }
    );
  }
}