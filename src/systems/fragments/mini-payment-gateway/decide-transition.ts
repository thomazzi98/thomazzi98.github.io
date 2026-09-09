export function decideTransition(request: TransitionRequest): TransitionDecision {
  // Checked first and without exception. A late event arriving against a finished
  // payment is recorded elsewhere and never applied; resurrecting a terminal
  // payment is the bug class that double-credits a merchant.
  if (isTerminalPaymentStatus(request.from)) {
    return { permitted: false, refusal: { reason: 'terminal_status', from: request.from } };
  }

  const transition = TRANSITIONS_BY_KEY.get(`${request.from}:${request.trigger}`);
  if (transition === undefined) {
    return {
      permitted: false,
      refusal: { reason: 'no_such_transition', from: request.from, trigger: request.trigger },
    };
  }

  if (rankOf(request.evidence) < rankOf(transition.minimumEvidence)) {
    return {
      permitted: false,
      refusal: {
        reason: 'insufficient_evidence',
        required: transition.minimumEvidence,
        supplied: request.evidence,
      },
    };
  }

  return { permitted: true, to: transition.to, transition };
}
