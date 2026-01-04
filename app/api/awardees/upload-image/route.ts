import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Self-service image upload - for awardees editing their own profiles
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const image = formData.get('image') as File
        const awardeeId = formData.get('awardee_id') as string

        if (!image) {
            return NextResponse.json(
                { success: false, message: 'No image provided' },
                { status: 400 }
            )
        }

        if (!awardeeId) {
            return NextResponse.json(
                { success: false, message: 'Awardee ID is required' },
                { status: 400 }
            )
        }

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
        if (!validTypes.includes(image.type)) {
            return NextResponse.json(
                { success: false, message: 'Invalid file type. Please upload JPG, PNG, WebP, or GIF.' },
                { status: 400 }
            )
        }

        // Validate file size (max 5MB)
        if (image.size > 5 * 1024 * 1024) {
            return NextResponse.json(
                { success: false, message: 'File too large. Maximum size is 5MB.' },
                { status: 400 }
            )
        }

        const supabase = createAdminClient()

        // Verify awardee exists
        const { data: awardee, error: awardeeError } = await supabase
            .from('awardees')
            .select('id')
            .eq('id', awardeeId)
            .single()

        if (awardeeError || !awardee) {
            return NextResponse.json(
                { success: false, message: 'Awardee not found' },
                { status: 404 }
            )
        }

        // Generate unique filename
        const fileExt = image.name.split('.').pop()
        const fileName = `${awardeeId}-${Date.now()}.${fileExt}`

        // Upload to Supabase storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('awardees')
            .upload(fileName, image, {
                cacheControl: '3600',
                upsert: true
            })

        if (uploadError) {
            console.error('Error uploading image:', uploadError)
            return NextResponse.json(
                { success: false, message: 'Failed to upload image', error: uploadError.message },
                { status: 500 }
            )
        }

        // Get public URL
        const { data: publicUrlData } = supabase.storage
            .from('awardees')
            .getPublicUrl(uploadData.path)

        return NextResponse.json({
            success: true,
            message: 'Image uploaded successfully',
            imageUrl: publicUrlData.publicUrl
        })
    } catch (error) {
        console.error('Error in self-service image upload:', error)
        return NextResponse.json(
            { success: false, message: 'Failed to upload image' },
            { status: 500 }
        )
    }
}
