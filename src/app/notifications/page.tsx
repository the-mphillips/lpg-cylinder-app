'use client'

import { useMemo, useState } from 'react'
import { api } from '@/lib/trpc/client'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function NotificationsPage() {
  const [showUnread, setShowUnread] = useState(false)
  const { data, refetch, isLoading } = api.notifications.list.useQuery({ limit: 50, unreadOnly: showUnread })
  const settingsQuery = api.notifications.getSettings.useQuery()
  const updateSettings = api.notifications.updateSettings.useMutation({ onSuccess: () => settingsQuery.refetch() })
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
          <CardTitle className="flex items-center justify-between">
            <span>Recent</span>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span>Toasts</span>
                <Switch checked={Boolean(settingsQuery.data?.toast_enabled)} onCheckedChange={(v) => updateSettings.mutate({ toast_enabled: v })} />
              </div>
              <div className="flex items-center gap-2">
                <span>Mute All</span>
                <Switch checked={Boolean(settingsQuery.data?.mute_all)} onCheckedChange={(v) => updateSettings.mutate({ mute_all: v })} />
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            {(['info','success','warning','error','system'] as const).map((t) => (
              <div key={t} className="flex items-center justify-between rounded border px-3 py-2">
                <span className="text-xs capitalize">{t}</span>
                <Switch
                  checked={Boolean(settingsQuery.data?.types?.[t])}
                  onCheckedChange={(v) => updateSettings.mutate({ types: { ...(settingsQuery.data?.types || {}), [t]: v } })}
                />
              </div>
            ))}
          </div>
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


