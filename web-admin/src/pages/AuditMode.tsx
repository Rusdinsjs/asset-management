import { useState } from 'react';
import {
    Container, Title, Paper, Text, Button, Group, Stack,
    TextInput, RingProgress, Center, Loader, Alert
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { auditApi } from '../api/audit';
import { assetApi } from '../api/assets';

export function AuditMode() {
    const queryClient = useQueryClient();
    const [assetInput, setAssetInput] = useState('');

    // Fetch assets for simulation
    const { data: assets } = useQuery({
        queryKey: ['assets'],
        queryFn: () => assetApi.list({ page: 1, per_page: 50 }),
        enabled: true
    });

    const simulateScan = () => {
        if (!assets?.data || assets.data.length === 0) {
            notifications.show({ title: 'No Assets', message: 'No assets found to simulate scan.', color: 'yellow' });
            return;
        }
        const randomAsset = assets.data[Math.floor(Math.random() * assets.data.length)];
        setAssetInput(randomAsset.id);
        notifications.show({ title: 'Simulated Scan', message: `Scanned: ${randomAsset.name ?? randomAsset.asset_code}`, color: 'blue' });
    };

    // Fetch active session
    const { data: activeSession, isLoading: isLoadingSession } = useQuery({
        queryKey: ['audit-session'],
        queryFn: auditApi.getActiveSession,
        refetchInterval: 5000
    });

    // Fetch progress if active session exists
    const { data: progress } = useQuery({
        queryKey: ['audit-progress', activeSession?.id],
        queryFn: () => auditApi.getProgress(activeSession!.id),
        enabled: !!activeSession,
        refetchInterval: 2000
    });

    // Mutations
    const startMutation = useMutation({
        mutationFn: auditApi.startSession,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['audit-session'] });
            notifications.show({ title: 'Audit Started', message: 'New audit session initialized.', color: 'green' });
        },
        onError: (err: any) => {
            notifications.show({ title: 'Error', message: err.response?.data?.message || 'Failed to start audit', color: 'red' });
        }
    });

    const closeMutation = useMutation({
        mutationFn: auditApi.closeSession,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['audit-session'] });
            notifications.show({ title: 'Audit Closed', message: 'Audit session finalized.', color: 'blue' });
        }
    });

    const submitMutation = useMutation({
        mutationFn: (vars: { assetId: string, status: string, notes?: string }) =>
            auditApi.submitRecord(activeSession!.id, vars.assetId, vars.status, vars.notes),
        onSuccess: () => {
            setAssetInput('');
            queryClient.invalidateQueries({ queryKey: ['audit-progress'] });
            notifications.show({ title: 'Recorded', message: 'Asset audit record saved.', color: 'green' });
        },
        onError: (err: any) => {
            notifications.show({ title: 'Error', message: err.response?.data?.message || 'Failed to submit record', color: 'red' });
        }
    });

    const handleStart = () => {
        startMutation.mutate(undefined);
    };

    const handleClose = () => {
        if (!activeSession) return;
        if (confirm('Are you sure you want to close this audit session?')) {
            closeMutation.mutate(activeSession.id);
        }
    };

    const handleSubmit = async () => {
        if (!assetInput) return;
        submitMutation.mutate({ assetId: assetInput, status: 'found' });
    };

    if (isLoadingSession) return <Center h={300}><Loader /></Center>;

    if (!activeSession) {
        return (
            <Container size="sm" py="xl">
                <Paper p="xl" radius="md" withBorder ta="center">
                    <Stack align="center" gap="lg">
                        <Title order={2}>Asset Audit</Title>
                        <Text c="dimmed">No active audit session found.</Text>
                        <Button
                            size="lg"
                            onClick={handleStart}
                            loading={startMutation.isPending}
                        >
                            Start New Session
                        </Button>
                    </Stack>
                </Paper>
            </Container>
        );
    }

    const progressValue = progress ? Math.round((progress.audited / progress.total) * 100) : 0;

    return (
        <Container size="md" py="xl">
            <Stack gap="lg">
                <Group justify="space-between" align="center">
                    <div>
                        <Title order={2}>Audit in Progress</Title>
                        <Text c="dimmed" size="sm">Started: {new Date(activeSession.created_at).toLocaleString()}</Text>
                    </div>
                    <Button color="red" variant="light" onClick={handleClose} loading={closeMutation.isPending}>
                        Close Session
                    </Button>
                </Group>

                <Paper p="md" radius="md" withBorder>
                    <Group justify="center" gap="xl">
                        <RingProgress
                            size={160}
                            thickness={16}
                            roundCaps
                            sections={[{ value: progressValue, color: 'blue' }]}
                            label={
                                <Center>
                                    <Stack gap={0} align="center">
                                        <Text fw={700} size="xl">{progressValue}%</Text>
                                        <Text size="xs" c="dimmed">Completed</Text>
                                    </Stack>
                                </Center>
                            }
                        />
                        <Stack gap="xs">
                            <Text size="sm">Total Assets: <Text span fw={700}>{progress?.total || 0}</Text></Text>
                            <Text size="sm">Audited: <Text span fw={700} c="blue">{progress?.audited || 0}</Text></Text>
                            <Text size="sm">Remaining: <Text span fw={700} c="orange">{(progress?.total || 0) - (progress?.audited || 0)}</Text></Text>
                        </Stack>
                    </Group>
                </Paper>

                <Paper p="lg" radius="md" withBorder>
                    <Stack>
                        <Title order={4}>Scan / Input Asset ID</Title>
                        <Group align="flex-end">
                            <TextInput
                                label="Asset ID / UUID"
                                placeholder="Enter asset UUID..."
                                style={{ flex: 1 }}
                                value={assetInput}
                                onChange={(e) => setAssetInput(e.currentTarget.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                            />
                            <Button variant="default" onClick={simulateScan}>
                                Simulate QR
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                loading={submitMutation.isPending}
                                leftSection={<IconCheck size={18} />}
                            >
                                Submit Found
                            </Button>
                        </Group>
                        <Alert icon={<IconAlertCircle size={16} />} title="Note" color="blue" variant="light">
                            Enter the Asset UUID to mark it as found. In a real mobile app, this would use the camera scanner.
                        </Alert>
                    </Stack>
                </Paper>
            </Stack>
        </Container>
    );
}
