import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'

export function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-8xl font-bold text-primary opacity-30">404</h1>
        <h2 className="mt-4 text-2xl font-bold text-foreground">Page not found</h2>
        <p className="mt-2 text-muted-foreground">The page you are looking for doesn&apos;t exist.</p>
        <Button asChild className="mt-6">
          <Link to="/dashboard">Go to Dashboard</Link>
        </Button>
      </motion.div>
    </div>
  )
}
