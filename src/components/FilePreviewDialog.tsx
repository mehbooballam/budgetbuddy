import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'

interface FilePreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fileUrl: string | null
  fileName: string | null
}

export function FilePreviewDialog({ open, onOpenChange, fileUrl, fileName }: FilePreviewDialogProps) {
  if (!fileUrl) return null

  const isImage = fileName ? /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName) : false
  const isPdf = fileName ? /\.pdf$/i.test(fileName) : false

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate">{fileName ?? 'File Preview'}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden min-h-0">
          {isImage ? (
            <img
              src={fileUrl}
              alt={fileName ?? 'Preview'}
              className="max-w-full max-h-[70vh] object-contain mx-auto rounded-lg"
            />
          ) : isPdf ? (
            <iframe
              src={fileUrl}
              className="w-full h-[70vh] rounded-lg border border-border"
              title={fileName ?? 'PDF Preview'}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-40 gap-4 text-muted-foreground">
              <p>Preview not available for this file type.</p>
              <Button variant="outline" onClick={() => window.open(fileUrl, '_blank')}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in New Tab
              </Button>
            </div>
          )}
        </div>
        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => window.open(fileUrl, '_blank')}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in New Tab
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
