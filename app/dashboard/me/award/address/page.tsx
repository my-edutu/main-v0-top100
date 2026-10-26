'use client'

import { useDashboardMember } from '../../../_providers/dashboard-member'
import { DeliveryAddressForm } from './delivery-address-form'

export default function AwardAddressPage() {
  const { member } = useDashboardMember()
  return <DeliveryAddressForm member={member} />
}
