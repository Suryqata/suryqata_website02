<section id="checkout" class="checkout-page" data-checkout-page>
  <div class="checkout-hero">
    <p class="checkout-kicker">Checkout</p>
    <h2>Finish your order</h2>
    <p>Move through each step, review your selections, and place the order when everything looks right.</p>
  </div>

  <div class="checkout-layout">
    <div class="checkout-main">
      <div class="checkout-progress">
        <button type="button" class="checkout-progress-step is-active" data-step-indicator="0">
          <span>1</span>
          <strong>Billing</strong>
        </button>
        <button type="button" class="checkout-progress-step" data-step-indicator="1">
          <span>2</span>
          <strong>Delivery</strong>
        </button>
        <button type="button" class="checkout-progress-step" data-step-indicator="2">
          <span>3</span>
          <strong>Payment</strong>
        </button>
        <button type="button" class="checkout-progress-step" data-step-indicator="3">
          <span>4</span>
          <strong>Review</strong>
        </button>
      </div>

      <form class="checkout-form" novalidate>
        <section class="checkout-step is-active">
          <div class="checkout-step-head">
            <h3>Biller details</h3>
            <p>Tell us who the order is for and where the invoice should go.</p>
          </div>
          <div class="checkout-field-grid">
            <label class="checkout-field checkout-field-full">
              <span>Full name</span>
              <input type="text" name="fullName" placeholder="Your full name" required />
            </label>
            <label class="checkout-field">
              <span>Email address</span>
              <input type="email" name="email" placeholder="name@example.com" required />
            </label>
            <label class="checkout-field">
              <span>Phone number</span>
              <input type="tel" name="phone" placeholder="+353 ..." required />
            </label>
            <label class="checkout-field checkout-field-full">
              <span>Address line 1</span>
              <input type="text" name="addressLine1" placeholder="Street and number" required />
            </label>
            <label class="checkout-field checkout-field-full">
              <span>Address line 2</span>
              <input type="text" name="addressLine2" placeholder="Apartment, suite or unit (optional)" />
            </label>
            <label class="checkout-field">
              <span>City</span>
              <input type="text" name="city" required />
            </label>
            <label class="checkout-field">
              <span>Postcode</span>
              <input type="text" name="postcode" required />
            </label>
            <label class="checkout-field checkout-field-full">
              <span>Country</span>
              <input type="text" name="country" required />
            </label>
          </div>
        </section>

        <section class="checkout-step" hidden>
          <div class="checkout-step-head">
            <h3>Delivery options</h3>
            <p>Pick how you want the order prepared and add any delivery instructions.</p>
          </div>
          <div class="checkout-choice-grid">
            <label class="checkout-choice-card">
              <input type="radio" name="shippingMethod" value="Studio Pickup" required />
              <span>Studio Pickup</span>
              <small>Collect the order in person.</small>
            </label>
            <label class="checkout-choice-card">
              <input type="radio" name="shippingMethod" value="Standard Delivery" />
              <span>Standard Delivery</span>
              <small>Reliable home delivery.</small>
            </label>
            <label class="checkout-choice-card">
              <input type="radio" name="shippingMethod" value="Insured Delivery" />
              <span>Insured Delivery</span>
              <small>Extra care for fragile work.</small>
            </label>
          </div>
          <div class="checkout-field-grid checkout-spacing-top">
            <label class="checkout-field checkout-field-full">
              <span>Order note</span>
              <textarea
                name="orderNotes"
                rows="4"
                placeholder="Special requests, delivery notes, framing preferences..."
              ></textarea>
            </label>
            <label class="checkout-checkline">
              <input type="checkbox" name="giftMessage" />
              <span>This order includes a gift message.</span>
            </label>
          </div>
        </section>

        <section class="checkout-step" hidden>
          <div class="checkout-step-head">
            <h3>Payment method</h3>
            <p>Stripe will securely process your card payment after you review the order.</p>
          </div>
          <input type="hidden" name="paymentMethod" value="Stripe" />
          <div class="checkout-choice-grid">
            <div class="checkout-choice-card">
              <span>Stripe</span>
              <small>Pay securely with Visa or Mastercard on Stripe.</small>
            </div>
          </div>
        </section>

        <section class="checkout-step" hidden>
          <div class="checkout-step-head">
            <h3>Review and confirm</h3>
            <p>Check the details below before placing the order.</p>
          </div>
          <div class="checkout-review-grid">
            <article class="checkout-review-card">
              <h4>Billing</h4>
              <div data-review-billing></div>
            </article>
            <article class="checkout-review-card">
              <h4>Delivery</h4>
              <div data-review-delivery></div>
            </article>
            <article class="checkout-review-card">
              <h4>Payment</h4>
              <div data-review-payment></div>
            </article>
            <article class="checkout-review-card">
              <h4>Notes</h4>
              <div data-review-notes></div>
            </article>
          </div>
          <label class="checkout-checkline checkout-spacing-top">
            <input type="checkbox" name="acceptTerms" required />
            <span>I confirm the order details are correct.</span>
          </label>
        </section>
      </form>

      <p class="checkout-inline-message" data-checkout-message></p>

      <div class="checkout-actions">
        <button type="button" class="checkout-secondary-button" data-checkout-back hidden>Back</button>
        <button type="button" class="checkout-primary-button" data-checkout-next>Continue</button>
        <button type="button" class="checkout-primary-button" data-checkout-submit hidden>Continue to Payment</button>
      </div>
    </div>

    <aside class="checkout-sidebar">
      <div class="checkout-summary-card">
        <div class="checkout-summary-head">
          <p class="checkout-kicker">Order summary</p>
          <h3>Your cart</h3>
        </div>
        <div class="checkout-summary-items" data-checkout-summary-items></div>
        <div class="checkout-summary-totals" data-checkout-summary-totals></div>
      </div>
    </aside>
  </div>

  <div class="checkout-confirmation" data-checkout-confirmation hidden>
    <p class="checkout-kicker">Order placed</p>
    <h3>Thank you for your order</h3>
    <p>Your reference number is <strong data-confirmation-order></strong>.</p>
    <p>Your payment was processed by Stripe. A receipt will be sent to your email.</p>
    <div class="checkout-confirmation-actions">
      <a href="/gallery.html" class="checkout-primary-link">Continue shopping</a>
      <a href="/" class="checkout-secondary-link">Back to home</a>
    </div>
  </div>
</section>
