import apiRequest from "../api/apiRequest";

// --- eSewa Sandbox Integration (eSewa ePay v2.0 Form Submission) ---
const initiateEsewaPayment = (event, amount) => {
  const path = import.meta.SANDBOX_URL;

  const parameters = {
    amount: amount,
    tax_amount: "0",
    total_amount: amount,
    transaction_uuid: `TXN-${Date.now()}-${event._id}`,
    product_code: import.meta.env.VITE_ESEWA_MERCHANT_CODE,
    product_service_charge: "0",
    product_delivery_charge: "0",
    success_url: `${window.location.origin}/payment-success?event_id=${event._id}`,
    failure_url: `${window.location.origin}/payment-failure?event_id=${event._id}`,
    signed_field_names: "total_amount,transaction_uuid,product_code",
    signature: "SANDBOX_SIGNATURE_PLACEHOLDER",
  };

  // Dynamically create and submit a form to eSewa's gateway
  const form = document.createElement("form");
  form.method = "POST";
  form.action = path;

  for (const key in parameters) {
    const hiddenField = document.createElement("input");
    hiddenField.type = "hidden";
    hiddenField.name = key;
    hiddenField.value = parameters[key];
    form.appendChild(hiddenField);
  }

  document.body.appendChild(form);
  form.submit();
};

// --- Khalti Sandbox Integration (Khalti Checkout Widget / API) ---
const initiateKhaltiPayment = async (event, amount, userDetails) => {
  try {
    const payload = {
      return_url: `${window.location.origin}/payment-success?event_id=${event._id}`,
      website_url: window.location.origin,
      amount: amount * 100,
      purchase_order_id: event._id,
      purchase_order_name: event.title,
      customer_info: {
        name: userDetails?.name || "Test User",
        email: userDetails?.email || "test@example.com",
        phone: userDetails?.phone || "9800000000",
      },
    };

    // Call your backend endpoint which securely talks to Khalti init API using your secret key
    const response = await apiRequest.post(
      "/payments/khalti/initiate",
      payload,
    );

    if (response.data && response.data.payment_url) {
      window.location.href = response.data.payment_url;
    }
  } catch (error) {
    console.error("Khalti payment initiation failed:", error);
    throw error;
  }
};

export { initiateEsewaPayment, initiateKhaltiPayment };
