export function assessFinality(
  payment: Payment,
  progress: ChainProgress,
  secondOpinion: FinalityConfirmation,
): FinalityAssessment {
  const height = payment.settlingBlockHeight;
  if (height === null) {
    return { creditable: false, confirmations: 0, reason: 'no settling block has been observed' };
  }

  const confirmations = confirmationsFor(payment, progress.tip.height);
  if (confirmations < payment.requiredConfirmations) {
    return {
      creditable: false,
      confirmations,
      reason: `${confirmations.toString()} of ${payment.requiredConfirmations.toString()} confirmations`,
    };
  }

  if (!payment.requiresFinalityTag) {
    return { creditable: true, confirmations, reason: 'confirmation count reached' };
  }

  // A provider that cannot answer must never be read as "nothing is final". Holding costs the
  // merchant a few seconds; guessing costs them the payment.
  if (progress.finalizedHeight === null) {
    return {
      creditable: false,
      confirmations,
      reason: 'the chain has not reported a finalized height',
    };
  }
  if (progress.finalizedHeight < height) {
    return {
      creditable: false,
      confirmations,
      reason: 'the settling block is not yet finalized',
    };
  }

  // The second opinion comes from a separately operated endpoint. It defeats a single lagging or
  // dishonest provider; it does not defeat a correlated failure, which is documented rather than
  // claimed away.
  if (secondOpinion === 'contradicted') {
    return {
      creditable: false,
      confirmations,
      reason: 'a second provider disagrees that the settling block is finalized',
    };
  }
  if (secondOpinion === 'unavailable') {
    return {
      creditable: false,
      confirmations,
      reason: 'no second provider could confirm finality',
    };
  }

  return { creditable: true, confirmations, reason: 'confirmed and finalized' };
}
