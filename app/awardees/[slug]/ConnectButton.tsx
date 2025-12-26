'use client'

import { useState } from 'react'
import { Mail, Linkedin, Twitter, Facebook, X, Share2 } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

interface ConnectButtonProps {
    email?: string | null
    personalEmail?: string | null
    linkedin?: string | null
    twitter?: string | null
    facebook?: string | null
    name: string
}

export default function ConnectButton({
    email,
    personalEmail,
    linkedin,
    twitter,
    facebook,
    name
}: ConnectButtonProps) {
    const [isOpen, setIsOpen] = useState(false)

    const contactEmail = email || personalEmail
    const hasAnyContact = contactEmail || linkedin || twitter || facebook

    if (!hasAnyContact) return null

    const contactOptions = [
        {
            key: 'email',
            label: 'Email',
            icon: Mail,
            href: contactEmail ? `mailto:${contactEmail}` : null,
            color: 'bg-gray-900 hover:bg-gray-800 text-white',
        },
        {
            key: 'linkedin',
            label: 'LinkedIn',
            icon: Linkedin,
            href: linkedin,
            color: 'bg-[#0A66C2] hover:bg-[#004182] text-white',
        },
        {
            key: 'twitter',
            label: 'X (Twitter)',
            icon: Twitter,
            href: twitter,
            color: 'bg-black hover:bg-gray-900 text-white',
        },
        {
            key: 'facebook',
            label: 'Facebook',
            icon: Facebook,
            href: facebook,
            color: 'bg-[#1877F2] hover:bg-[#0d65d9] text-white',
        },
    ].filter(option => option.href)

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold uppercase tracking-wider transition-colors rounded-sm"
            >
                <Share2 className="h-4 w-4" />
                Connect
            </button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-sm bg-white p-0 overflow-hidden rounded-lg border-0 shadow-2xl">
                    <DialogHeader className="px-5 pt-5 pb-3 border-b border-gray-100">
                        <DialogTitle className="text-lg font-bold text-gray-900">
                            Connect with {name.split(' ')[0]}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="p-4 space-y-2">
                        {contactOptions.map((option) => {
                            const Icon = option.icon
                            return (
                                <a
                                    key={option.key}
                                    href={option.href!}
                                    target={option.key !== 'email' ? '_blank' : undefined}
                                    rel={option.key !== 'email' ? 'noopener noreferrer' : undefined}
                                    onClick={() => setIsOpen(false)}
                                    className={`flex items-center gap-3 w-full px-4 py-3 text-white font-medium transition-all rounded ${option.color}`}
                                >
                                    <Icon className="h-4 w-4 text-white" />
                                    <span className="text-white text-sm">{option.label}</span>
                                </a>
                            )
                        })}
                    </div>

                    <div className="px-4 pb-4">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-full py-2 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-wider"
                        >
                            Cancel
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
