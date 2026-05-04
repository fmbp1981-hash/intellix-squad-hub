import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface WorkspaceCardProps {
  id: string
  clientName: string
  engagementName: string
  description?: string | null
  activeRuns: number
}

export function WorkspaceCard({ id, clientName, engagementName, description, activeRuns }: WorkspaceCardProps) {
  return (
    <Link href={`/workspaces/${id}`}>
      <Card className="bg-gray-900 border-gray-800 hover:border-gray-600 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-white text-base">{clientName}</CardTitle>
            {activeRuns > 0 && (
              <Badge variant="default" className="bg-green-600 text-xs">
                {activeRuns} rodando
              </Badge>
            )}
          </div>
          <p className="text-gray-400 text-sm">{engagementName}</p>
        </CardHeader>
        {description && (
          <CardContent>
            <p className="text-gray-500 text-sm line-clamp-2">{description}</p>
          </CardContent>
        )}
      </Card>
    </Link>
  )
}
