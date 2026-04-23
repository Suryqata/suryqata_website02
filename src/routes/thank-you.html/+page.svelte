<section id="checkout" class="checkout-page" data-thank-you-page>
  <div class="checkout-confirmation">
    <p class="checkout-kicker">Order placed</p>
    <h3>Thank you for your order</h3>
    <p>Your reference number is <strong data-confirmation-order></strong>.</p>
    <p>
      We have safely recorded your order details for invoice generation. You can preview or download the final invoice
      below.
    </p>

    <div class="checkout-invoice-panel checkout-spacing-top">
      <div class="checkout-invoice-head">
        <h4>Invoice</h4>
        <p data-invoice-status>Your invoice is ready to preview and download.</p>
      </div>
      <div class="checkout-invoice-actions">
        <button type="button" class="checkout-secondary-button" data-invoice-preview>View invoice</button>
        <button type="button" class="checkout-secondary-button" data-invoice-download>Download PDF</button>
      </div>
      <div class="checkout-invoice-viewer">
        <p class="checkout-invoice-placeholder" data-invoice-placeholder>
          Click "View invoice" to open the final invoice preview.
        </p>
        <iframe title="Invoice preview" data-invoice-frame hidden></iframe>
      </div>
    </div>

    <div class="checkout-confirmation-actions">
      <a href="/gallery.html" class="checkout-primary-link">Continue shopping</a>
      <a href="/" class="checkout-secondary-link">Back to home</a>
    </div>
  </div>
</section>
