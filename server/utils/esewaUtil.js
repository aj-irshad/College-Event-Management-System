import crypto from "crypto";

export const generateEsewaSignature = (
  totalAmount,
  transactionUuid,
  productCode,
  secretKey,
) => {
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
  const hash = crypto
    .createHmac("sha256", secretKey)
    .update(message)
    .digest("base64");
  return hash;
};
