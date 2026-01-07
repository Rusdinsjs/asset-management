import { Paper, Text, Timeline, ThemeIcon, ScrollArea } from '@mantine/core';
import { IconCheck, IconPlus, IconEdit, IconTrash, IconExchange, IconTool } from '@tabler/icons-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export interface ActivityItem {
    entity_type: string;
    entity_id: string;
    action: string;
    description: string;
    user_name?: string;
    created_at: string;
}

interface RecentActivityProps {
    activities: ActivityItem[];
}

function getIconForAction(action: string) {
    switch (action.toLowerCase()) {
        case 'created':
        case 'create':
            return <IconPlus size={16} />;
        case 'updated':
        case 'update':
            return <IconEdit size={16} />;
        case 'deleted':
        case 'delete':
            return <IconTrash size={16} />;
        case 'transferred':
            return <IconExchange size={16} />;
        case 'completed':
            return <IconCheck size={16} />;
        case 'maintenance':
            return <IconTool size={16} />;
        default:
            return <IconCheck size={16} />;
    }
}

function getColorForAction(action: string) {
    switch (action.toLowerCase()) {
        case 'created':
        case 'create':
            return 'green';
        case 'updated':
        case 'update':
            return 'blue';
        case 'deleted':
        case 'delete':
            return 'red';
        case 'transferred':
            return 'violet';
        case 'completed':
            return 'teal';
        case 'maintenance':
            return 'orange';
        default:
            return 'gray';
    }
}

export function RecentActivity({ activities }: RecentActivityProps) {
    if (!activities || activities.length === 0) {
        return (
            <Paper withBorder p="md" radius="md">
                <Text size="lg" fw={600} mb="md">Recent Activity</Text>
                <Text c="dimmed" fs="italic">No recent activity found.</Text>
            </Paper>
        );
    }

    return (
        <Paper withBorder p="md" radius="md">
            <Text size="lg" fw={600} mb="xl">Recent Activity</Text>
            <ScrollArea h={400} offsetScrollbars>
                <Timeline active={activities.length} bulletSize={24} lineWidth={2}>
                    {activities.map((item, index) => (
                        <Timeline.Item
                            key={`${item.entity_id}-${index}`}
                            bullet={
                                <ThemeIcon
                                    size={22}
                                    variant="gradient"
                                    gradient={{ from: getColorForAction(item.action), to: getColorForAction(item.action), deg: 105 }}
                                    radius="xl"
                                >
                                    {getIconForAction(item.action)}
                                </ThemeIcon>
                            }
                            title={item.description}
                        >
                            <Text c="dimmed" size="xs">
                                {item.action} by {item.user_name || 'System'} - {dayjs(item.created_at).fromNow()}
                            </Text>
                        </Timeline.Item>
                    ))}
                </Timeline>
            </ScrollArea>
        </Paper>
    );
}
