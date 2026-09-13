export function trackingView(status: string) {
  const stages = ['paid', 'dispatched', 'in_transit', 'delivered']
  const index = stages.indexOf(status)
  const titles = ['Payment confirmed', 'Dispatched', 'In transit', 'Delivered']
  const descriptions = ['Your award is being prepared for dispatch.', 'Your parcel has been dispatched.', 'Your parcel is on its way.', 'Your award has been delivered.']
  return {
    index,
    title: index >= 0 ? titles[index] : status === 'cancelled' ? 'Order cancelled' : 'Order needs attention',
    description: index >= 0 ? descriptions[index] : 'Contact the team for an update on this order.',
  }
}
