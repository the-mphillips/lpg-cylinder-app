'use client'

import { useMemo, useState } from 'react'
import { api } from '@/lib/trpc/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function NotificationsPage() {
  const [showUnread, setShowUnread] = useState(false)
  const { data, refetch, isLoading } = api.notifications.list.useQuery({ limit: 50, unreadOnly: showUnread })
  const markAllRead = api.notifications.markAllRead.useMutation({ onSuccess: () => refetch() })
  const items = useMemo(() => data?.items || [], [data])

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">Your recent activity and system updates</p>
        </div>
        <div className="flex gap-2">
          <Button variant={showUnread ? 'default' : 'outline'} onClick={() => setShowUnread(!showUnread)}>
            {showUnread ? 'Showing Unread' : 'Show Unread'}
          </Button>
          <Button variant="outline" onClick={() => refetch()}>Refresh</Button>
          <Button onClick={() => markAllRead.mutate()} disabled={isLoading}>Mark all read</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 && (
            <div className="text-sm text-muted-foreground">No notifications</div>
          )}
          {items.map((n: { id: string; title: string; message: string; created_at: string; read_at?: string | null; link?: string | null }) => (
            <div key={n.id} className="p-3 border rounded-md flex items-start gap-3">
              <div className={`mt-1 h-2 w-2 rounded-full ${n.read_at ? 'bg-muted' : 'bg-blue-600'}`} />
              <div className="flex-1">
                <div className="text-sm font-medium">{n.title}</div>
                <div className="text-xs text-muted-foreground whitespace-pre-wrap">{n.message}</div>
                <div className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</div>
              </div>
              {n.link && (
                <a href={n.link} className="text-xs text-primary underline">Open</a>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}


