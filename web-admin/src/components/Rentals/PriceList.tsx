import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Table, Paper, Badge, Group, ActionIcon, Button, Text,
    LoadingOverlay, Modal, Stack, Grid, Title,
    TextInput, NumberInput, Select, Divider
} from '@mantine/core';
import { IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';
import { rentalApi, type RentalRate } from '../../api/rental';
import { notifications } from '@mantine/notifications';
import { useForm } from '@mantine/form';

export function PriceList() {
    const queryClient = useQueryClient();
    const [opened, setOpened] = useState(false);
    const [editingRate, setEditingRate] = useState<any>(null);

    const { data: rates, isLoading } = useQuery({
        queryKey: ['rental-rates'],
        queryFn: () => rentalApi.listRentalRates()
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => rentalApi.createRentalRate(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rental-rates'] });
            notifications.show({ title: 'Success', message: 'Price item added', color: 'green' });
            setOpened(false);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: any }) => rentalApi.updateRentalRate(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rental-rates'] });
            notifications.show({ title: 'Success', message: 'Price template updated', color: 'green' });
            setOpened(false);
            setEditingRate(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => rentalApi.deleteRentalRate(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rental-rates'] });
            notifications.show({ title: 'Success', message: 'Price template deleted', color: 'green' });
        }
    });

    const form = useForm({
        initialValues: {
            name: '',
            rate_basis: 'hourly',
            rate_amount: 0,
            minimum_hours: 200,
            overtime_multiplier: 1.25,
            standby_multiplier: 0.50,
            breakdown_penalty_per_day: 0,
            hours_per_day: 8,
            days_per_month: 25,
            currency: 'IDR'
        }
    });

    const handleFormSubmit = (values: any) => {
        const payload = {
            ...values,
            rate_type: values.rate_basis
        };

        if (editingRate) {
            updateMutation.mutate({ id: editingRate.id, data: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const handleEdit = (rate: RentalRate) => {
        setEditingRate(rate);
        form.setValues({
            name: rate.name,
            rate_basis: (rate.rate_basis as any) || 'hourly',
            rate_amount: Number(rate.rate_amount) || 0,
            minimum_hours: Number(rate.minimum_hours) || 200,
            overtime_multiplier: Number(rate.overtime_multiplier) || 1.25,
            standby_multiplier: Number(rate.standby_multiplier) || 0.50,
            breakdown_penalty_per_day: Number(rate.breakdown_penalty_per_day) || 0,
            hours_per_day: Number(rate.hours_per_day) || 8,
            days_per_month: Number(rate.days_per_month) || 25,
            currency: rate.currency || 'IDR'
        });
        setOpened(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this price template?')) {
            deleteMutation.mutate(id);
        }
    };

    return (
        <Stack gap="md">
            <Group justify="space-between">
                <Title order={4}>Standard Price List (Templates)</Title>
                <Button leftSection={<IconPlus size={16} />} onClick={() => {
                    setEditingRate(null);
                    form.reset();
                    setOpened(true);
                }}>
                    Add New Template
                </Button>
            </Group>

            <Paper p="md" shadow="sm" withBorder pos="relative">
                <LoadingOverlay visible={isLoading} />
                <Table verticalSpacing="sm" highlightOnHover>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Template Name</Table.Th>
                            <Table.Th>Basis</Table.Th>
                            <Table.Th>Rate (IDR)</Table.Th>
                            <Table.Th>Min Hours</Table.Th>
                            <Table.Th>Overtime</Table.Th>
                            <Table.Th>Standby</Table.Th>
                            <Table.Th>Action</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {rates?.map((rate: RentalRate) => (
                            <Table.Tr key={rate.id}>
                                <Table.Td>
                                    <Text fw={500}>{rate.name}</Text>
                                </Table.Td>
                                <Table.Td>
                                    <Badge variant="outline">{rate.rate_basis}</Badge>
                                </Table.Td>
                                <Table.Td>{rate.rate_amount?.toLocaleString()}</Table.Td>
                                <Table.Td>{rate.minimum_hours}h / mo</Table.Td>
                                <Table.Td>{((rate.overtime_multiplier || 1) * 100).toFixed(0)}%</Table.Td>
                                <Table.Td>{((rate.standby_multiplier || 0) * 100).toFixed(0)}%</Table.Td>
                                <Table.Td>
                                    <Group gap={4}>
                                        <ActionIcon variant="subtle" color="blue" onClick={() => handleEdit(rate)}>
                                            <IconEdit size={16} />
                                        </ActionIcon>
                                        <ActionIcon
                                            variant="subtle"
                                            color="red"
                                            onClick={() => handleDelete(rate.id)}
                                            loading={deleteMutation.isPending && deleteMutation.variables === rate.id}
                                        >
                                            <IconTrash size={16} />
                                        </ActionIcon>
                                    </Group>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                        {!rates?.length && !isLoading && (
                            <Table.Tr>
                                <Table.Td colSpan={7} align="center">No price templates defined.</Table.Td>
                            </Table.Tr>
                        )}
                    </Table.Tbody>
                </Table>
            </Paper>

            <Modal
                opened={opened}
                onClose={() => setOpened(false)}
                title={editingRate ? "Edit Price Template" : "Create New Price Template"}
                size="lg"
            >
                <form onSubmit={form.onSubmit(handleFormSubmit)}>
                    <Stack gap="md">
                        <TextInput
                            label="Template Name"
                            placeholder="e.g. Excavator PC200 Standard (200h)"
                            required
                            {...form.getInputProps('name')}
                        />

                        <Grid>
                            <Grid.Col span={6}>
                                <Select
                                    label="Rate Basis"
                                    data={[
                                        { value: 'hourly', label: 'Hourly' },
                                        { value: 'daily', label: 'Daily' },
                                        { value: 'monthly', label: 'Monthly' }
                                    ]}
                                    {...form.getInputProps('rate_basis')}
                                />
                            </Grid.Col>
                            <Grid.Col span={6}>
                                <NumberInput
                                    label="Rate Amount"
                                    prefix="Rp "
                                    thousandSeparator=","
                                    required
                                    {...form.getInputProps('rate_amount')}
                                />
                            </Grid.Col>
                        </Grid>

                        <Divider label="Contract Rules (Billing Automation)" labelPosition="center" />

                        <Grid>
                            <Grid.Col span={4}>
                                <NumberInput
                                    label="Min Hours/Month"
                                    description="Guaranteed billing"
                                    {...form.getInputProps('minimum_hours')}
                                />
                            </Grid.Col>
                            <Grid.Col span={4}>
                                <NumberInput
                                    label="Overtime Mult."
                                    description="e.g. 1.25 for 125%"
                                    step={0.05}
                                    {...form.getInputProps('overtime_multiplier')}
                                />
                            </Grid.Col>
                            <Grid.Col span={4}>
                                <NumberInput
                                    label="Standby Mult."
                                    description="e.g. 0.5 for 50%"
                                    step={0.05}
                                    {...form.getInputProps('standby_multiplier')}
                                />
                            </Grid.Col>
                        </Grid>

                        <Grid>
                            <Grid.Col span={6}>
                                <NumberInput
                                    label="Breakdown Penalty / Day"
                                    prefix="Rp "
                                    thousandSeparator=","
                                    {...form.getInputProps('breakdown_penalty_per_day')}
                                />
                            </Grid.Col>
                            <Grid.Col span={3}>
                                <NumberInput
                                    label="Hrs/Day"
                                    {...form.getInputProps('hours_per_day')}
                                />
                            </Grid.Col>
                            <Grid.Col span={3}>
                                <NumberInput
                                    label="Days/Mo"
                                    {...form.getInputProps('days_per_month')}
                                />
                            </Grid.Col>
                        </Grid>

                        <Group justify="flex-end" mt="md">
                            <Button variant="outline" onClick={() => setOpened(false)}>Cancel</Button>
                            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
                                {editingRate ? "Update Template" : "Save Template"}
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>
        </Stack>
    );
}
