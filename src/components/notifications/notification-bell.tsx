"use client"

import { useEffect, useMemo, useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { api } from '@/lib/trpc/client'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface NotificationItem {
  id: string
  type: 'info' | 'success' | 'warning' | 'error' | 'system'
  title: string
  message: string
  link?: string | null
  created_at: string
  read_at?: string | null
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
  return `${Math.floor(diff/86400)}d ago`
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const supabase = createClient()
  const { data: currentUser } = api.auth.getCurrentUser.useQuery()
  const listQuery = api.notifications.list.useQuery({ limit: 8 }, { refetchInterval: false })
  const markRead = api.notifications.markRead.useMutation({ onSuccess: () => listQuery.refetch() })
  const markAllRead = api.notifications.markAllRead.useMutation({ onSuccess: () => listQuery.refetch() })
  const settingsQuery = api.notifications.getSettings.useQuery(undefined, { refetchOnWindowFocus: false })

  // Realtime updates
  useEffect(() => {
    if (!currentUser?.id) return
    const allowRealtime = (settingsQuery.data?.toast_enabled || true) && !settingsQuery.data?.mute_all
    if (!allowRealtime) return
    let refetchTimeout: ReturnType<typeof setTimeout> | null = null
    const debouncedRefetch = () => {
      if (refetchTimeout) clearTimeout(refetchTimeout)
      refetchTimeout = setTimeout(() => listQuery.refetch(), 150)
    }
    const channel = supabase.channel('realtime:notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.id}` }, () => {
        debouncedRefetch()
      })
      .subscribe()
    return () => {
      if (refetchTimeout) clearTimeout(refetchTimeout)
      supabase.removeChannel(channel)
    }
  }, [supabase, currentUser?.id, listQuery, settingsQuery.data?.toast_enabled, settingsQuery.data?.mute_all])

  // In-app toasts when enabled
  useEffect(() => {
    if (!currentUser?.id) return
    const allowToast = settingsQuery.data?.toast_enabled && !settingsQuery.data?.mute_all
    if (!allowToast) return
    const channel = supabase.channel('realtime:notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.id}` }, (payload) => {
        const n = (payload.new ?? {}) as { title?: string; message?: string; link?: string | null }
        const title = n.title || 'Notification'
        const description = n.message
        const link = n.link
        toast(title, { description, action: link ? { label: 'Open', onClick: () => window.location.assign(link) } : undefined })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, currentUser?.id, settingsQuery.data?.toast_enabled, settingsQuery.data?.mute_all])

  const unreadCount = listQuery.data?.unreadCount || 0
  const items: NotificationItem[] = useMemo(() => (listQuery.data?.items as NotificationItem[]) || [], [listQuery.data])

  const badge = unreadCount > 0 ? (
    <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center">
      {unreadCount > 9 ? '9+' : unreadCount}
    </span>
  ) : null

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full" aria-label="Notifications" >
          <Bell className="h-5 w-5" />
          {badge}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-96" align="end">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => markAllRead.mutate()}>Mark all read</Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/notifications">Preferences</Link>
            </Button>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications</div>
        )}
        {items.map((n) => (
          <DropdownMenuItem key={n.id} className="flex items-start gap-2 py-3" onClick={() => markRead.mutate({ id: n.id })}>
            <div className={`mt-1 h-2 w-2 rounded-full ${n.read_at ? 'bg-muted' : 'bg-blue-600'}`} />
            <div className="flex-1">
              <div className="text-sm font-medium">{n.title}</div>
              <div className="text-xs text-muted-foreground line-clamp-2">{n.message}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</div>
            </div>
            {n.link && (
              <Button asChild size="sm" variant="outline">
                <Link href={n.link}>Open</Link>
              </Button>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/notifications" className="w-full text-center">View all</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}


