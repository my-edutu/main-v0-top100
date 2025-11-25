'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { X } from 'lucide-react'

export default function NewsletterForm() {
  const [isOpen, setIsOpen] = useState(false)

  const handleInputClick = () => {
    setIsOpen(true)
  }

  const handleSubscribeClick = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsOpen(true)
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Input
            type="email"
            placeholder="Email address"
            onClick={handleInputClick}
            readOnly
            className="w-full rounded-2xl border-0 bg-white py-6 pl-6 pr-32 shadow-sm shadow-black/5 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-0 cursor-pointer"
          />
          <Button
            onClick={handleSubscribeClick}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-orange-500 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-orange-600 transition-colors"
          >
            Subscribe
          </Button>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
          <div className="relative w-full h-[500px] bg-white">
            <Button
              onClick={() => setIsOpen(false)}
              className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 p-0"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
            <iframe
              src="https://f0aba197.sibforms.com/serve/MUIFAIX4jNgejxzB9j7LS1E-7DbWjDQ-qp_nE1tOaxxoSvVVSWUtOFLQHWVyGoXMeNGP64idMYht7EskwNQNesfUonK-f3ZqeE2A7oX4Td6ddc2SFM34u-wXAZ8Bpyfo2B4WnQcuqgjaMgsqFbzBZ3xdP7zBXt8v5_gP5Yn5zqkZD7CvvpRhZAJ5Rz1NZJgz0hjnSyYj8ihKRxEE"
              className="w-full h-full"
              style={{ border: 0 }}
              scrolling="auto"
              allowFullScreen
              title="Newsletter Subscription Form"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}