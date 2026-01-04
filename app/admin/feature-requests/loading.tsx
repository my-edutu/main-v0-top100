import { Loader2 } from 'lucide-react'

export default function Loading() {
    return (
        <div className="container mx-auto py-8 flex justify-center items-center min-h-[400px]">
            <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-600" />
                <p className="text-muted-foreground">Loading feature requests...</p>
            </div>
        </div>
    )
}
