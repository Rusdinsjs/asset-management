import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Table, Paper, Badge, Group, ActionIcon, Button, Text,
    LoadingOverlay, Stack, Grid, Image, Title,
    Textarea, Divider, Center
} from '@mantine/core';
import { IconCheck, IconX, IconEye, IconPhoto } from '@tabler/icons-react';
import { timesheetApi, type TimesheetDetail } from '../../api/timesheet';
import { notifications } from '@mantine/notifications';
import { useForm } from '@mantine/form';

export function TimesheetReviewer() {
    const queryClient = useQueryClient();
    const [selectedTs, setSelectedTs] = useState<TimesheetDetail | null>(null);

    const { data: pendingTs, isLoading } = useQuery({
        queryKey: ['timesheets', 'pending'],
        queryFn: () => timesheetApi.listPending()
    });

    const verifyMutation = useMutation({
        mutationFn: ({ id, status, notes }: { id: string, status: 'approved' | 'rejected', notes?: string }) =>
            timesheetApi.verify(id, { status, notes }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timesheets'] });
            notifications.show({ title: 'Success', message: 'Timesheet verified', color: 'green' });
            setSelectedTs(null);
        },
        onError: (err: any) => {
            notifications.show({ title: 'Error', message: err.message || 'Verification failed', color: 'red' });
        }
    });

    const form = useForm({
        initialValues: {
            notes: '',
        }
    });

    const handleVerify = (status: 'approved' | 'rejected') => {
        if (!selectedTs) return;
        verifyMutation.mutate({
            id: selectedTs.id,
            status,
            notes: form.values.notes
        });
    };

    return (
        <Stack gap="md">
            <Group justify="space-between">
                <Title order={4}>Timesheet Review Mode (Evidence-Based)</Title>
                <Badge size="lg" color="orange" variant="filled">
                    {pendingTs?.length || 0} Pending Items
                </Badge>
            </Group>

            <Grid gutter="md">
                <Grid.Col span={selectedTs ? 5 : 12}>
                    <Paper p="md" shadow="sm" withBorder pos="relative">
                        <LoadingOverlay visible={isLoading} />
                        <Table verticalSpacing="sm" highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Date</Table.Th>
                                    <Table.Th>Asset / Rental</Table.Th>
                                    <Table.Th>Hours (Op/St)</Table.Th>
                                    <Table.Th>Evidence</Table.Th>
                                    <Table.Th>Action</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {pendingTs?.map((ts) => (
                                    <Table.Tr
                                        key={ts.id}
                                        style={{ cursor: 'pointer', backgroundColor: selectedTs?.id === ts.id ? 'var(--mantine-color-blue-light)' : undefined }}
                                        onClick={() => {
                                            setSelectedTs(ts);
                                            form.setValues({ notes: ts.verifier_notes || '' });
                                        }}
                                    >
                                        <Table.Td>
                                            <Text size="sm" fw={500}>{ts.work_date}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Stack gap={0}>
                                                <Text size="sm">{ts.asset_name}</Text>
                                                <Text size="xs" c="dimmed">{ts.rental_number}</Text>
                                            </Stack>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm">{ts.operating_hours} / {ts.standby_hours}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Group gap={4}>
                                                <IconPhoto size={16} color={ts.photos?.length ? 'blue' : 'gray'} />
                                                <Text size="xs">{ts.photos?.length || 0}</Text>
                                            </Group>
                                        </Table.Td>
                                        <Table.Td>
                                            <ActionIcon variant="subtle">
                                                <IconEye size={16} />
                                            </ActionIcon>
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                                {!pendingTs?.length && !isLoading && (
                                    <Table.Tr>
                                        <Table.Td colSpan={5} align="center">All caught up! No pending timesheets.</Table.Td>
                                    </Table.Tr>
                                )}
                            </Table.Tbody>
                        </Table>
                    </Paper>
                </Grid.Col>

                {selectedTs && (
                    <Grid.Col span={7}>
                        <Paper p="md" shadow="sm" withBorder>
                            <Stack>
                                <Group justify="space-between">
                                    <Title order={5}>Detail Evidence: {selectedTs.work_date}</Title>
                                    <ActionIcon variant="subtle" onClick={() => setSelectedTs(null)}>
                                        <IconX size={16} />
                                    </ActionIcon>
                                </Group>
                                <Divider />

                                <Grid>
                                    <Grid.Col span={6}>
                                        <Stack gap="xs">
                                            <Text size="xs" c="dimmed">Hour Meter / KM</Text>
                                            <Group grow>
                                                <Paper p="xs" withBorder>
                                                    <Text size="xs" c="dimmed">Start</Text>
                                                    <Text fw={500}>{selectedTs.hm_km_start || '-'}</Text>
                                                </Paper>
                                                <Paper p="xs" withBorder>
                                                    <Text size="xs" c="dimmed">End</Text>
                                                    <Text fw={500}>{selectedTs.hm_km_end || '-'}</Text>
                                                </Paper>
                                                <Paper p="xs" withBorder bg="blue.0">
                                                    <Text size="xs" c="dimmed">Usage</Text>
                                                    <Text fw={700} color="blue">{selectedTs.hm_km_usage || '-'}</Text>
                                                </Paper>
                                            </Group>
                                        </Stack>
                                    </Grid.Col>
                                    <Grid.Col span={6}>
                                        <Stack gap="xs">
                                            <Text size="xs" c="dimmed">Work Location & Description</Text>
                                            <Text size="sm"><b>Loc:</b> {selectedTs.work_location || '-'}</Text>
                                            <Text size="sm">{selectedTs.work_description || 'No description'}</Text>
                                        </Stack>
                                    </Grid.Col>
                                </Grid>

                                <Text size="xs" c="dimmed" mt="sm">Photo Evidence (From Field)</Text>
                                <Group wrap="wrap" gap="xs">
                                    {selectedTs.photos && selectedTs.photos.length > 0 ? (
                                        selectedTs.photos.map((url, idx) => (
                                            <Image
                                                key={idx}
                                                src={url}
                                                w={150}
                                                h={150}
                                                fallbackSrc="https://placehold.co/150x150?text=No+Photo"
                                                radius="sm"
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => window.open(url, '_blank')}
                                            />
                                        ))
                                    ) : (
                                        <Center h={100} w="100%" bg="gray.0" style={{ borderRadius: 8, border: '1px dashed var(--mantine-color-gray-3)' }}>
                                            <Text c="dimmed">No photo documentation uploaded</Text>
                                        </Center>
                                    )}
                                </Group>

                                <Divider mt="md" />

                                <Textarea
                                    label="Verification Notes"
                                    placeholder="Add notes for the field checker..."
                                    {...form.getInputProps('notes')}
                                />

                                <Group grow mt="md">
                                    <Button
                                        color="red"
                                        variant="outline"
                                        leftSection={<IconX size={16} />}
                                        onClick={() => handleVerify('rejected')}
                                        loading={verifyMutation.isPending}
                                    >
                                        Reject / Revision
                                    </Button>
                                    <Button
                                        color="green"
                                        leftSection={<IconCheck size={16} />}
                                        onClick={() => handleVerify('approved')}
                                        loading={verifyMutation.isPending}
                                    >
                                        Verify & Approve
                                    </Button>
                                </Group>
                            </Stack>
                        </Paper>
                    </Grid.Col>
                )}
            </Grid>
        </Stack>
    );
}
