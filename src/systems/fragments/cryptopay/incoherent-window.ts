  private findIncoherentTransfer(result: TransferScanResult): string | null {
    if (result.transfers.length === 0) {
      return null;
    }

    const referenceByHeight = new Map(
      result.headers.map((header) => [header.position.height, header.position.reference]),
    );
    const lowestHeader = result.headers.at(0)?.position.height ?? null;

    for (const transfer of result.transfers) {
      const expected = referenceByHeight.get(transfer.position.height);
      if (expected === undefined) {
        if (lowestHeader !== null && transfer.position.height < lowestHeader) {
          continue;
        }
        return `no header covers height ${transfer.position.height.toString()}, which carries transfer ${transfer.reference.transactionReference}`;
      }
      if (expected !== transfer.position.reference) {
        return `transfer ${transfer.reference.transactionReference} reports block ${transfer.position.reference} at height ${transfer.position.height.toString()}, where the header says ${expected}`;
      }
    }

    return null;
  }
