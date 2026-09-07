'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import SelectionEngineClient from './selection-engine-client'

const RankingWorkspace = dynamic(() => import('./ranking-workspace'), {
  loading: () => (
    <div className="flex min-h-52 items-center justify-center rounded-2xl border bg-white">
      <Loader2 className="size-7 animate-spin text-orange-500" />
    </div>
  ),
})

export default function SelectionWorkspace() {
  return (
    <Tabs defaultValue="processing" className="space-y-6">
      <TabsList className="h-auto flex-wrap justify-start rounded-xl bg-zinc-100 p-1">
        <TabsTrigger value="processing">Applicant processing</TabsTrigger>
        <TabsTrigger value="rankings">Rankings and approvals</TabsTrigger>
      </TabsList>

      <TabsContent value="processing">
        <SelectionEngineClient />
      </TabsContent>

      <TabsContent value="rankings">
        <RankingWorkspace />
      </TabsContent>
    </Tabs>
  )
}
