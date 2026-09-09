  current: DeliveryAcknowledgement,
  incoming: DeliveryAcknowledgement,
): DeliveryAcknowledgement {
  if (incoming === deliveryAcknowledgements.error) {
    return deliveryAcknowledgements.error;
  }
  if (current === deliveryAcknowledgements.error) {
    return deliveryAcknowledgements.error;
  }
  return Math.max(current, incoming) as DeliveryAcknowledgement;
}
