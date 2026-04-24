import Stripe from 'stripe';

const SIZE_PRICES = {
  Small: 2000,
  Medium: 4500,
  Large: 11000
};

function sanitizeText(value, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function getUnitAmount(size) {
  return SIZE_PRICES[size] || SIZE_PRICES.Medium;
}

export function getStripeClient() {
  const secretKey = String(process.env.STRIPE_SECRET_KEY || '').trim();

  if (!secretKey) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in the server environment.');
  }

  if (!secretKey.startsWith('sk_')) {
    throw new Error('Invalid STRIPE_SECRET_KEY: expected a Stripe secret key starting with sk_.');
  }

  return new Stripe(secretKey);
}

export function normalizeCheckoutCart(cart) {
  if (!Array.isArray(cart)) {
    return [];
  }

  return cart
    .map((entry) => {
      const size = sanitizeText(entry?.size, 'Medium');
      const quantity = Math.max(1, Math.min(Number(entry?.quantity) || 1, 25));
      const title = sanitizeText(entry?.title, 'Artwork');

      return {
        id: sanitizeText(entry?.id, `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${size.toLowerCase()}`),
        artworkId: sanitizeText(entry?.artworkId, ''),
        title,
        description: sanitizeText(entry?.description, ''),
        size,
        quantity,
        unitAmount: getUnitAmount(size)
      };
    })
    .filter((entry) => entry.quantity > 0);
}

export function buildStripeLineItems(cart) {
  return normalizeCheckoutCart(cart).map((entry) => ({
    quantity: entry.quantity,
    price_data: {
      currency: 'eur',
      unit_amount: entry.unitAmount,
      product_data: {
        name: entry.title,
        description: entry.description || `Size: ${entry.size}`,
        metadata: {
          artworkId: entry.artworkId || entry.id,
          size: entry.size
        }
      }
    }
  }));
}

export function buildOrderMetadata(formData = {}) {
  return {
    fullName: sanitizeText(formData.fullName, 'Customer'),
    email: sanitizeText(formData.email, ''),
    phone: sanitizeText(formData.phone, ''),
    addressLine1: sanitizeText(formData.addressLine1, ''),
    addressLine2: sanitizeText(formData.addressLine2, ''),
    city: sanitizeText(formData.city, ''),
    postcode: sanitizeText(formData.postcode, ''),
    country: sanitizeText(formData.country, ''),
    shippingMethod: sanitizeText(formData.shippingMethod, ''),
    orderNotes: sanitizeText(formData.orderNotes, ''),
    giftMessage: formData.giftMessage ? 'true' : 'false'
  };
}

export function buildOrderFromSession(session, lineItems) {
  const metadata = session?.metadata || {};

  return {
    orderNumber: session?.id || '',
    placedAt: session?.created ? new Date(session.created * 1000).toISOString() : new Date().toISOString(),
    paymentStatus: session?.payment_status || 'unpaid',
    formData: {
      fullName: metadata.fullName || session?.customer_details?.name || 'Customer',
      email: metadata.email || session?.customer_details?.email || '',
      phone: metadata.phone || session?.customer_details?.phone || '',
      addressLine1: metadata.addressLine1 || '',
      addressLine2: metadata.addressLine2 || '',
      city: metadata.city || '',
      postcode: metadata.postcode || '',
      country: metadata.country || '',
      shippingMethod: metadata.shippingMethod || '',
      paymentMethod: 'Card (Stripe)',
      orderNotes: metadata.orderNotes || '',
      giftMessage: metadata.giftMessage === 'true'
    },
    items: (lineItems?.data || []).map((entry) => {
      const product = entry?.price?.product;
      const productMetadata = product && typeof product !== 'string' ? product.metadata || {} : {};
      const size = productMetadata.size || 'Medium';

      return {
        id: productMetadata.artworkId || entry.id,
        artworkId: productMetadata.artworkId || '',
        title: entry.description || 'Artwork',
        description: '',
        size,
        quantity: entry.quantity || 1,
        price: Math.round((entry?.price?.unit_amount || 0) / 100)
      };
    })
  };
}