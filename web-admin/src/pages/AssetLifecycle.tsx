import { useState } from 'react';
import {
    Title,
    Paper,
    Stack,
    Group,
    Text,
    Badge,
    Button,
    Timeline,
    Modal,
    Textarea,
    LoadingOverlay,
    Card,
    SimpleGrid,
    ThemeIcon,
    Divider,
    Alert,
    Tooltip,
    Tabs,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    IconArrowRight,
    IconCheck,
    IconClock,
    IconAlertTriangle,
    IconPackage,
    IconTruck,
    IconTool,
    IconTrash,
    IconArchive,
    IconRefresh,
    IconLock,
    IconInfoCircle,
    IconHistory,
    IconExchange,
} from '@tabler/icons-react';
import { useParams, useNavigate } from 'react-router-dom';
import { lifecycleApi } from '../api/lifecycle';
import type { LifecycleHistory } from '../api/lifecycle';
import { useAuthStore } from '../store/useAuthStore';
import { AssetConversionModal } from '../components/Assets/AssetConversionModal';
import { ConversionHistory } from '../components/Assets/ConversionHistory';

// State icon mapping
const stateIcons: Record<string, React.ReactNode> = {
    planning: <IconClock size={16} />,
    procurement: <IconTruck size={16} />,
    received: <IconPackage size={16} />,
    in_inventory: <IconPackage size={16} />,
    deployed: <IconCheck size={16} />,
    under_maintenance: <IconTool size={16} />,
    under_repair: <IconTool size={16} />,
    under_conversion: <IconRefresh size={16} />,
    retired: <IconAlertTriangle size={16} />,
    disposed: <IconTrash size={16} />,
    lost_stolen: <IconAlertTriangle size={16} />,
    archived: <IconArchive size={16} />,
};

// Mantine color mapping
const stateColors: Record<string, string> = {
    planning: 'gray',
    procurement: 'blue',
    received: 'cyan',
    in_inventory: 'green',
    deployed: 'teal',
    under_maintenance: 'yellow',
    under_repair: 'orange',
    under_conversion: 'violet',
    retired: 'gray',
    disposed: 'dark',
    lost_stolen: 'red',
    archived: 'gray',
};

// Permission requirements for each transition
const transitionPermissions: Record<string, number> = {
    // Role levels: 1=SuperAdmin, 2=Manager, 3=Supervisor, 4=Operator, 5=Viewer
    'planning': 4,           // Operator can start planning
    'procurement': 3,        // Supervisor can move to procurement
    'received': 4,           // Operator can mark as received
    'in_inventory': 4,       // Operator can add to inventory
    'deployed': 3,           // Supervisor can deploy
    'under_maintenance': 4,  // Operator can send to maintenance
    'under_repair': 4,       // Operator can send to repair
    'under_conversion': 2,   // Manager required for conversion
    'retired': 2,            // Manager required to retire
    'disposed': 2,           // Manager required to dispose
    'lost_stolen': 3,        // Supervisor can report lost/stolen
    'archived': 2,           // Manager required to archive
};

export function AssetLifecycle() {
    const { id: assetId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [opened, { open, close }] = useDisclosure(false);
    const [conversionModalOpened, { open: openConversionModal, close: closeConversionModal }] = useDisclosure(false);
    const [selectedState, setSelectedState] = useState<string | null>(null);
    const [reason, setReason] = useState('');
    const [activeTab, setActiveTab] = useState<string | null>('lifecycle');

    // Get user permissions
    const { user, hasRoleLevel } = useAuthStore();
    const userRoleLevel = user?.role_level ?? 5;

    // Check if user can perform a specific transition
    const canTransition = (targetState: string): boolean => {
        const requiredLevel = transitionPermissions[targetState] ?? 2;
        return hasRoleLevel(requiredLevel);
    };

    // Fetch all states
    const { data: allStates, isLoading: loadingStates, error: statesError } = useQuery({
        queryKey: ['lifecycle-states'],
        queryFn: lifecycleApi.getAllStates,
    });

    // Fetch current status from database
    const { data: currentStatus } = useQuery({
        queryKey: ['current-status', assetId],
        queryFn: () => lifecycleApi.getCurrentStatus(assetId!),
        enabled: !!assetId,
    });

    // Fetch valid transitions with approval info
    const { data: validTransitions, isLoading: loadingTransitions, error: transitionsError } = useQuery({
        queryKey: ['valid-transitions-with-approval', assetId],
        queryFn: () => lifecycleApi.getValidTransitionsWithApproval(assetId!),
        enabled: !!assetId,
    });

    // Fetch lifecycle history
    const { data: history, isLoading: loadingHistory, error: historyError } = useQuery({
        queryKey: ['lifecycle-history', assetId],
        queryFn: () => lifecycleApi.getHistory(assetId!),
        enabled: !!assetId,
    });

    // Transition mutation using request-transition (with approval workflow)
    const transitionMutation = useMutation({
        mutationFn: () => lifecycleApi.requestTransition(assetId!, selectedState!, reason || undefined),
        onSuccess: (response) => {
            if (response.result_type === 'Executed') {
                notifications.show({
                    title: 'Success',
                    message: 'Asset status updated successfully',
                    color: 'green',
                });
            } else {
                notifications.show({
                    title: 'Approval Request Created',
                    message: response.message || 'Your transition request has been submitted for approval',
                    color: 'blue',
                });
            }
            queryClient.invalidateQueries({ queryKey: ['current-status', assetId] });
            queryClient.invalidateQueries({ queryKey: ['valid-transitions-with-approval', assetId] });
            queryClient.invalidateQueries({ queryKey: ['lifecycle-history', assetId] });
            close();
            setSelectedState(null);
            setReason('');
        },
        onError: (error: Error) => {
            notifications.show({
                title: 'Error',
                message: error.message || 'Failed to update status',
                color: 'red',
            });
        },
    });

    const handleCardClick = (stateValue: string) => {
        if (!canTransition(stateValue)) {
            notifications.show({
                title: 'Permission Denied',
                message: 'You do not have permission to perform this transition',
                color: 'red',
            });
            return;
        }
        setSelectedState(stateValue);
        open();
    };

    const handleTransition = () => {
        if (!selectedState) return;
        transitionMutation.mutate();
    };

    // Use actual status from database
    const getCurrentState = (): string => {
        if (currentStatus) {
            return currentStatus.value;
        }
        return 'planning';
    };

    const getStateLabel = (value: string): string => {
        const state = allStates?.find((s) => s.value === value);
        return state?.label || value.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    };

    const getRoleName = (level: number): string => {
        const roles: Record<number, string> = {
            1: 'Super Admin',
            2: 'Manager',
            3: 'Supervisor',
            4: 'Operator',
            5: 'Viewer',
        };
        return roles[level] || 'Unknown';
    };

    if (!assetId) {
        return <Text>Asset ID is required</Text>;
    }

    const hasError = statesError || transitionsError;

    return (
        <Stack gap="lg">
            <Group justify="space-between">
                <Title order={2}>Asset Management</Title>
                <Group>
                    <Badge color="blue" variant="light">
                        Your Role: {getRoleName(userRoleLevel)}
                    </Badge>
                    <Button variant="light" onClick={() => navigate(-1)}>
                        Back
                    </Button>
                </Group>
            </Group>

            <Tabs value={activeTab} onChange={setActiveTab} radius="md">
                <Tabs.List>
                    <Tabs.Tab value="lifecycle" leftSection={<IconHistory size={16} />}>
                        Lifecycle
                    </Tabs.Tab>
                    <Tabs.Tab value="conversions" leftSection={<IconExchange size={16} />}>
                        Conversions
                    </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="lifecycle" pt="md">
                    <Stack gap="lg">
                        {hasError && (
                            <Alert icon={<IconInfoCircle size={16} />} color="red" title="Error loading data">
                                {String(statesError || transitionsError)}
                            </Alert>
                        )}

                        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                            {/* Current State and Transitions */}
                            <Paper withBorder p="md" radius="md" pos="relative">
                                <LoadingOverlay visible={loadingTransitions || loadingStates} />
                                <Stack>
                                    <Text size="lg" fw={600}>Current Status</Text>
                                    <Group>
                                        <Badge
                                            size="xl"
                                            color={stateColors[getCurrentState()] || 'gray'}
                                            leftSection={stateIcons[getCurrentState()]}
                                        >
                                            {getStateLabel(getCurrentState())}
                                        </Badge>
                                    </Group>

                                    <Divider my="sm" />

                                    <Text size="lg" fw={600}>Available Transitions</Text>
                                    {validTransitions && validTransitions.length > 0 ? (
                                        <SimpleGrid cols={2}>
                                            {validTransitions.map((state) => {
                                                const hasPermission = canTransition(state.value);
                                                const requiredLevel = state.approval_level || (transitionPermissions[state.value] ?? 2);
                                                const needsApproval = state.requires_approval;

                                                return (
                                                    <Tooltip
                                                        key={state.value}
                                                        label={
                                                            !hasPermission
                                                                ? `Requires ${getRoleName(requiredLevel)} or higher`
                                                                : needsApproval
                                                                    ? `Requires ${getRoleName(requiredLevel)} approval`
                                                                    : 'Click to transition (no approval needed)'
                                                        }
                                                        position="top"
                                                    >
                                                        <Card
                                                            withBorder
                                                            padding="sm"
                                                            radius="md"
                                                            style={{
                                                                cursor: hasPermission ? 'pointer' : 'not-allowed',
                                                                opacity: hasPermission ? 1 : 0.6,
                                                            }}
                                                            onClick={() => handleCardClick(state.value)}
                                                        >
                                                            <Group>
                                                                <ThemeIcon
                                                                    color={hasPermission ? (stateColors[state.value] || 'gray') : 'gray'}
                                                                    size="lg"
                                                                    radius="md"
                                                                >
                                                                    {hasPermission
                                                                        ? (stateIcons[state.value] || <IconArrowRight size={16} />)
                                                                        : <IconLock size={16} />
                                                                    }
                                                                </ThemeIcon>
                                                                <div style={{ flex: 1 }}>
                                                                    <Group gap={4}>
                                                                        <Text size="sm" fw={500}>{state.label}</Text>
                                                                        {needsApproval && (
                                                                            <Badge size="xs" color="orange" variant="light">
                                                                                Approval
                                                                            </Badge>
                                                                        )}
                                                                    </Group>
                                                                    {state.is_terminal && (
                                                                        <Text size="xs" c="dimmed">Terminal state</Text>
                                                                    )}
                                                                    {!hasPermission && (
                                                                        <Text size="xs" c="red">Requires {getRoleName(requiredLevel)}</Text>
                                                                    )}
                                                                    {hasPermission && needsApproval && (
                                                                        <Text size="xs" c="orange">Needs {getRoleName(requiredLevel)} approval</Text>
                                                                    )}
                                                                </div>
                                                            </Group>
                                                        </Card>
                                                    </Tooltip>
                                                );
                                            })}
                                        </SimpleGrid>
                                    ) : loadingTransitions ? null : (
                                        <Alert icon={<IconInfoCircle size={16} />} color="gray">
                                            No transitions available from current state. This may be a terminal state or the asset status needs to be set first.
                                        </Alert>
                                    )}
                                </Stack>
                            </Paper>

                            {/* Lifecycle History Timeline */}
                            <Paper withBorder p="md" radius="md" pos="relative">
                                <LoadingOverlay visible={loadingHistory} />
                                <Stack>
                                    <Text size="lg" fw={600}>Lifecycle History</Text>
                                    {historyError && (
                                        <Alert icon={<IconInfoCircle size={16} />} color="orange">
                                            Error loading history: {String(historyError)}
                                        </Alert>
                                    )}
                                    {history && history.length > 0 ? (
                                        <Timeline active={0} bulletSize={24} lineWidth={2}>
                                            {history.map((item: LifecycleHistory) => (
                                                <Timeline.Item
                                                    key={item.id}
                                                    bullet={stateIcons[item.to_state]}
                                                    color={stateColors[item.to_state] || 'gray'}
                                                    title={
                                                        <Group gap="xs">
                                                            <Text size="sm">{getStateLabel(item.from_state)}</Text>
                                                            <IconArrowRight size={14} />
                                                            <Text size="sm" fw={600}>{getStateLabel(item.to_state)}</Text>
                                                        </Group>
                                                    }
                                                >
                                                    {item.reason && <Text size="xs" c="dimmed">{item.reason}</Text>}
                                                    <Text size="xs" c="dimmed">
                                                        {new Date(item.created_at).toLocaleString()}
                                                    </Text>
                                                </Timeline.Item>
                                            ))}
                                        </Timeline>
                                    ) : loadingHistory ? null : (
                                        <Text c="dimmed" size="sm">No history records yet. Perform a transition to start tracking.</Text>
                                    )}
                                </Stack>
                            </Paper>
                        </SimpleGrid>

                        {/* State Overview */}
                        <Paper withBorder p="md" radius="md">
                            <Text size="lg" fw={600} mb="md">All Lifecycle States</Text>
                            <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 6 }}>
                                {allStates?.map((state) => (
                                    <Card
                                        key={state.value}
                                        withBorder
                                        padding="xs"
                                        radius="md"
                                        bg={state.value === getCurrentState() ? `${stateColors[state.value]}.1` : undefined}
                                    >
                                        <Group gap="xs">
                                            <ThemeIcon
                                                color={stateColors[state.value] || 'gray'}
                                                size="sm"
                                                variant={state.value === getCurrentState() ? 'filled' : 'light'}
                                            >
                                                {stateIcons[state.value] || <IconPackage size={12} />}
                                            </ThemeIcon>
                                            <Text size="xs" fw={state.value === getCurrentState() ? 600 : 400}>
                                                {state.label}
                                            </Text>
                                        </Group>
                                    </Card>
                                ))}
                            </SimpleGrid>
                        </Paper>
                    </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="conversions" pt="md">
                    <Stack gap="lg">
                        <Group justify="space-between">
                            <Text size="lg" fw={600}>Asset Conversions</Text>
                            <Button leftSection={<IconRefresh size={16} />} onClick={openConversionModal}>
                                Request Conversion
                            </Button>
                        </Group>
                        <Paper withBorder p="md" radius="md">
                            <ConversionHistory assetId={assetId!} />
                        </Paper>
                    </Stack>
                </Tabs.Panel>
            </Tabs>

            {/* Transition Confirmation Modal */}
            <Modal opened={opened} onClose={close} title="Confirm State Transition">
                <Stack>
                    <Group>
                        <Badge color={stateColors[getCurrentState()] || 'gray'}>
                            {getStateLabel(getCurrentState())}
                        </Badge>
                        <IconArrowRight size={16} />
                        <Badge color={stateColors[selectedState || ''] || 'gray'}>
                            {selectedState ? getStateLabel(selectedState) : ''}
                        </Badge>
                    </Group>

                    <Textarea
                        label="Reason (optional)"
                        placeholder="Enter reason for this transition..."
                        value={reason}
                        onChange={(e) => setReason(e.currentTarget.value)}
                        minRows={3}
                    />

                    <Group justify="flex-end">
                        <Button variant="default" onClick={close}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleTransition}
                            loading={transitionMutation.isPending}
                            color={stateColors[selectedState || ''] || 'blue'}
                        >
                            Confirm Transition
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            <AssetConversionModal
                opened={conversionModalOpened}
                onClose={closeConversionModal}
                assetId={assetId!}
                onSuccess={() => {
                    // Refresh history via query invalidation if needed, or component does it?
                    // ConversionHistory component fetches on mount, we might need to force refresh
                    // But for MVP, simple success message is okay. History component might not auto-refresh unless key changes.
                    // Actually, useQueryClient can invalidate here too if we want.
                }}
            />
        </Stack>
    );
}
