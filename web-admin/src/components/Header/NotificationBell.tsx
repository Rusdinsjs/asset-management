import { ActionIcon, Indicator, Popover, Text, ScrollArea, Button, Group, Stack, Loader, ThemeIcon } from '@mantine/core';
import { IconBell, IconCheck, IconInfoCircle, IconTool, IconBox } from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../../api/notifications';
import { useAuthStore } from '../../store/useAuthStore';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export function NotificationBell() {
    const user = useAuthStore((state) => state.user);
    const queryClient = useQueryClient();

    // Fetch unread count
    const { data: unreadCount } = useQuery({
        queryKey: ['notifications', 'unread-count', user?.id],
        queryFn: () => notificationsApi.countUnread(user!.id),
        enabled: !!user,
        refetchInterval: 30000, // Poll every 30s
    });

    // Fetch unread notifications for the list
    const { data: notifications, isLoading } = useQuery({
        queryKey: ['notifications', 'unread', user?.id],
        queryFn: () => notificationsApi.listUnread(user!.id),
        enabled: !!user,
    });

    // Mark as read mutation
    const markAsRead = useMutation({
        mutationFn: (id: string) => notificationsApi.markAsRead(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    // Mark all as read mutation
    const markAllAsRead = useMutation({
        mutationFn: () => notificationsApi.markAllAsRead(user!.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    const getIcon = (type?: string) => {
        switch (type) {
            case 'loan': return <IconBox size={16} />;
            case 'work_order': return <IconTool size={16} />;
            default: return <IconInfoCircle size={16} />;
        }
    };

    const getColor = (type?: string) => {
        switch (type) {
            case 'loan': return 'blue';
            case 'work_order': return 'orange';
            default: return 'gray';
        }
    };

    return (
        <Popover width={350} position="bottom-end" withArrow shadow="md">
            <Popover.Target>
                <Indicator inline label={unreadCount?.count} size={16} disabled={!unreadCount?.count}>
                    <ActionIcon variant="subtle" color="gray" size="lg">
                        <IconBell size={20} />
                    </ActionIcon>
                </Indicator>
            </Popover.Target>
            <Popover.Dropdown p={0}>
                <Group justify="space-between" p="xs" bg="gray.0" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
                    <Text size="sm" fw={600}>Notifications</Text>
                    {unreadCount?.count ? (
                        <Button variant="subtle" size="xs" onClick={() => markAllAsRead.mutate()} loading={markAllAsRead.isPending}>
                            Mark all as read
                        </Button>
                    ) : null}
                </Group>

                <ScrollArea h={300} type="auto">
                    {isLoading ? (
                        <Group justify="center" p="xl"><Loader size="sm" /></Group>
                    ) : notifications?.length === 0 ? (
                        <Text c="dimmed" size="sm" ta="center" p="xl">No new notifications</Text>
                    ) : (
                        <Stack gap={0}>
                            {notifications?.map((n) => (
                                <Group
                                    key={n.id}
                                    p="sm"
                                    wrap="nowrap"
                                    align="flex-start"
                                    style={{
                                        borderBottom: '1px solid var(--mantine-color-gray-2)',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => markAsRead.mutate(n.id)}
                                >
                                    <ThemeIcon variant="light" color={getColor(n.entity_type)} size="md" radius="xl">
                                        {getIcon(n.entity_type)}
                                    </ThemeIcon>
                                    <div style={{ flex: 1 }}>
                                        <Text size="sm" fw={500}>{n.title}</Text>
                                        <Text size="xs" c="dimmed" lineClamp={2}>{n.message}</Text>
                                        <Text size="xs" c="dimmed" mt={4}>{dayjs(n.created_at).fromNow()}</Text>
                                    </div>
                                    {!n.is_read && <IconCheck size={14} color="gray" style={{ opacity: 0.5 }} />}
                                </Group>
                            ))}
                        </Stack>
                    )}
                </ScrollArea>
            </Popover.Dropdown>
        </Popover>
    );
}
