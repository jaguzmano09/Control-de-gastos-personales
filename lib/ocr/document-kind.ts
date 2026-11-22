export type ReceiptDocumentKind = 'transfer' | 'unclassified'

export function classifyReceiptDocument(text: string): ReceiptDocumentKind {
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const transferHeader = /\b(?:comprobante|constancia|soporte)\s+de\s+transferencia\b/.test(normalized)
  const transferFlow = /\btransferencia\s+(?:exitosa|realizada|completada)\b/.test(normalized)
    && /\b(?:cuenta|bolsillo)\s+(?:origen|destino)\b/.test(normalized)
  return transferHeader || transferFlow ? 'transfer' : 'unclassified'
}
