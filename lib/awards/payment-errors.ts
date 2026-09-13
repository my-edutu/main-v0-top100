/** Only explicitly curated messages may cross the payment API boundary. */
export class AwardPaymentError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message)
    this.name = 'AwardPaymentError'
  }
}
