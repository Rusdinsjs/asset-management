import { Badge, type BadgeProps } from '@mantine/core';

interface StatusBadgeProps extends BadgeProps {
    status: string;
    customColors?: Record<string, string>;
}

const defaultColors: Record<string, string> = {
    approved: 'green',
    paid: 'green',
    completed: 'green',
    verified: 'blue',
    invoiced: 'blue',
    in_progress: 'blue',
    rejected: 'red',
    cancelled: 'red',
    pending: 'yellow',
    submitted: 'yellow',
    planned: 'gray',
    draft: 'gray',
};

export function StatusBadge({ status, customColors, ...props }: StatusBadgeProps) {
    const normalizeStatus = status?.toLowerCase().replace(' ', '_') || '';
    const color = customColors?.[normalizeStatus] || defaultColors[normalizeStatus] || 'gray';

    // Format status label: replace underscore with space and capitalize
    const label = status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Unknown';

    return (
        <Badge color={color} variant="light" {...props}>
            {label}
        </Badge>
    );
}
