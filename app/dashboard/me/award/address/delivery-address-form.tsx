'use client'

import { DeliveryCostChecker } from '../../../_components/delivery-cost-checker'
import type { MemberProfile } from '@/lib/member-hub'

export function DeliveryAddressForm({ member }: { member: MemberProfile }) {
  return <DeliveryCostChecker recipientName={member.name} backHref="/dashboard/me/award/complete" backLabel="Back to your awards" />
}
