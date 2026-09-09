export function isWebhookSignatureValid(
  rawBody: Buffer,
  suppliedSignature: string,
  signingKey: string,
): boolean {
  const expected = Buffer.from(
    createHmac(SIGNATURE_ALGORITHM, signingKey).update(rawBody).digest('hex'),
  );
  const supplied = Buffer.from(suppliedSignature);

  if (supplied.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(supplied, expected);
}
