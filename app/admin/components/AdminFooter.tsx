'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Mail, Shield, FileText, HelpCircle } from 'lucide-react'

export default function AdminFooter() {
  const currentYear = new Date().getFullYear()
  const [openDialog, setOpenDialog] = useState<string | null>(null)

  const footerLinks = [
    {
      id: 'privacy',
      label: 'Privacy Policy',
      icon: Shield,
      description: 'For privacy-related inquiries, please contact us.',
      email: 'partnership@top100afl.com',
      subject: 'Privacy Policy Inquiry'
    },
    {
      id: 'terms',
      label: 'Terms of Service',
      icon: FileText,
      description: 'For terms and conditions questions, please reach out.',
      email: 'partnership@top100afl.com',
      subject: 'Terms of Service Inquiry'
    },
    {
      id: 'support',
      label: 'Contact Us',
      icon: HelpCircle,
      description: 'Need help? We\'re here to assist you.',
      email: 'partnership@top100afl.com',
      subject: 'Support Request'
    }
  ]

  return (
    <>
      <footer className="bg-white border-t border-gray-200 py-6 mt-8">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-xs sm:text-sm text-gray-500">
              © {currentYear} Top100 Africa Future Leaders. All rights reserved.
            </div>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
              {footerLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => setOpenDialog(link.id)}
                  className="text-xs sm:text-sm text-gray-500 hover:text-orange-600 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <link.icon className="h-3.5 w-3.5" />
                  {link.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* Footer Link Dialogs */}
      {footerLinks.map((link) => (
        <Dialog key={link.id} open={openDialog === link.id} onOpenChange={(open) => setOpenDialog(open ? link.id : null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <link.icon className="h-5 w-5 text-orange-600" />
                </div>
                <DialogTitle className="text-xl">{link.label}</DialogTitle>
              </div>
              <DialogDescription className="text-zinc-500 text-sm">
                {link.description}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 p-4 bg-orange-50 rounded-xl border border-orange-100">
              <p className="text-sm text-zinc-600 mb-3">
                Please send us an email and we'll get back to you as soon as possible.
              </p>
              <a
                href={`mailto:${link.email}?subject=${encodeURIComponent(link.subject)}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-bold text-sm hover:from-orange-600 hover:to-amber-600 transition-all shadow-md shadow-orange-200"
              >
                <Mail className="h-4 w-4" />
                Email Us
              </a>
              <p className="mt-3 text-xs text-zinc-400">
                {link.email}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      ))}
    </>
  )
}