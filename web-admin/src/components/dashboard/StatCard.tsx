import { Paper, Group, Text, ThemeIcon } from '@mantine/core';

interface StatCardProps {
    label: string;
    value: string | number;
    icon: any;
    color: string;
    description?: string;
    trend?: {
        value: number;
        label: string;
        positive: boolean;
    };
}

export function StatCard({ label, value, icon: Icon, color, description, trend }: StatCardProps) {
    return (
        <Paper withBorder p="md" radius="md">
            <Group justify="space-between" mb="xs">
                <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                    {label}
                </Text>
                <ThemeIcon variant="light" color={color} size="lg" radius="md">
                    <Icon style={{ width: 20, height: 20 }} stroke={1.5} />
                </ThemeIcon>
            </Group>

            <Group align="flex-end" gap="xs">
                <Text fw={700} fz="xl" lh={1}>
                    {value}
                </Text>
                {trend && (
                    <Text c={trend.positive ? 'teal' : 'red'} fz="sm" fw={500} lh={1}>
                        <span>{trend.value > 0 ? '+' : ''}{trend.value}%</span>
                    </Text>
                )}
            </Group>

            {(description || trend) && (
                <Text size="xs" c="dimmed" mt={7}>
                    {trend ? trend.label : description}
                </Text>
            )}
        </Paper>
    );
}
