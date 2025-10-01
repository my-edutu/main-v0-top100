"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion, useAnimation } from "framer-motion"
import { useInView } from "react-intersection-observer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Send, CheckCircle, Mail, Phone, MapPin } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

export default function ContactSection() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  })
  const [newsletterEmail, setNewsletterEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isNewsletterSubmitting, setIsNewsletterSubmitting] = useState(false)
  const { toast } = useToast()

  const controls = useAnimation()
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  useEffect(() => {
    if (inView) {
      controls.start("visible")
    }
  }, [controls, inView])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prevState) => ({ ...prevState, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.from("contact_messages").insert({
        name: formData.name,
        email: formData.email,
        message: formData.message,
      })

      if (error) {
        throw error
      }

      setIsSubmitted(true)
      toast({
        title: "Message sent!",
        description: "Thank you for reaching out. We'll get back to you soon.",
      })

      // Reset form after 3 seconds
      setTimeout(() => {
        setIsSubmitted(false)
        setFormData({ name: "", email: "", message: "" })
      }, 3000)
    } catch (error) {
      console.error("Error submitting contact form:", error)
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsNewsletterSubmitting(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.from("newsletter_subscribers").insert({
        email: newsletterEmail,
      })

      if (error) {
        // Handle duplicate email error gracefully
        if (error.code === "23505") {
          toast({
            title: "Already subscribed!",
            description: "This email is already subscribed to our newsletter.",
          })
        } else {
          throw error
        }
      } else {
        toast({
          title: "Subscribed!",
          description: "You've been added to our newsletter.",
        })
      }

      setNewsletterEmail("")
    } catch (error) {
      console.error("Error subscribing to newsletter:", error)
      toast({
        title: "Error",
        description: "Failed to subscribe. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsNewsletterSubmitting(false)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  }

  return (
    <section id="contact" ref={ref} className="py-12 bg-zinc-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:40px_40px]" />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent" />
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate={controls}
        className="container mx-auto px-4 relative z-10"
      >
        <motion.h2
          variants={itemVariants}
          className="text-3xl md:text-4xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-white to-orange-300"
        >
          Get in Touch
        </motion.h2>

        <div className="max-w-2xl mx-auto">
          {/* Contact Form */}
          <motion.div
            variants={itemVariants}
            className="bg-black/50 backdrop-blur-lg rounded-2xl p-6 border border-orange-400/20 mb-6"
          >
            <h3 className="text-xl font-bold mb-4 text-white">Send us a Message</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="text"
                  name="name"
                  placeholder="Your Name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="bg-white/5 border-zinc-700 text-zinc-200 placeholder-zinc-500 h-10"
                />
              </div>
              <div>
                <Input
                  type="email"
                  name="email"
                  placeholder="Your Email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="bg-white/5 border-zinc-700 text-zinc-200 placeholder-zinc-500 h-10"
                />
              </div>
              <div>
                <Textarea
                  name="message"
                  placeholder="Your Message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={4}
                  className="bg-white/5 border-zinc-700 text-zinc-200 placeholder-zinc-500 resize-none"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-orange-500 text-white hover:bg-orange-600 transition-colors h-10"
                disabled={isSubmitting || isSubmitted}
              >
                <span className="flex items-center justify-center">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={16} />
                      Sending...
                    </>
                  ) : isSubmitted ? (
                    <>
                      <CheckCircle className="mr-2" size={16} />
                      Sent!
                    </>
                  ) : (
                    <>
                      <Send className="mr-2" size={16} />
                      Send Message
                    </>
                  )}
                </span>
              </Button>
            </form>
          </motion.div>

          {/* Contact Information */}
          <motion.div variants={itemVariants}>
            <div className="bg-black/50 backdrop-blur-lg rounded-2xl p-6 border border-orange-400/20">
              <h3 className="text-xl font-bold mb-4 text-white">Contact Information</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Mail className="w-4 h-4 text-orange-400 mr-3" />
                  <div>
                    <p className="text-zinc-300 text-sm">Email</p>
                    <p className="text-white text-sm">patnership@top100Afl.com</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Phone className="w-4 h-4 text-orange-400 mr-3" />
                  <div>
                    <p className="text-zinc-300 text-sm">Phone</p>
                    <p className="text-white text-sm">+234 816 940 0427</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 text-orange-400 mr-3" />
                  <div>
                    <p className="text-zinc-300 text-sm">Address</p>
                    <p className="text-white text-sm">Lagos, Nigeria</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}
