import { useEffect } from 'react';
import { useForm } from '@mantine/form';
import {
    NumberInput,
    Select,
    Button,
    Group,
    Stack,
    Textarea,
    LoadingOverlay,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { maintenanceApi } from '../api/maintenance';
import type { CreateMaintenanceRequest, UpdateMaintenanceRequest } from '../api/maintenance';
import { assetApi } from '../api/assets';

interface WorkOrderFormProps {
    maintenanceId?: string | null; // If null, create mode
    onClose: () => void;
    onSuccess: () => void;
}

export function WorkOrderForm({ maintenanceId, onClose, onSuccess }: WorkOrderFormProps) {
    const queryClient = useQueryClient();
    const isEdit = !!maintenanceId;

    const form = useForm({
        initialValues: {
            asset_id: '',
            maintenance_type_id: '', // TODO: Fetch types
            scheduled_date: new Date(),
            description: '',
            cost: undefined as number | undefined,
            vendor_id: '',
            status: 'planned',
            findings: '',
            actions_taken: '',
            odometer_reading: undefined as number | undefined,
        },
        validate: {
            asset_id: (value) => (value ? null : 'Asset is required'),
            description: (value) => (value ? null : 'Description is required'),
        },
    });

    // Fetch Assets for Select
    const { data: assetsData, isLoading: assetsLoading } = useQuery({
        queryKey: ['assets'],
        queryFn: async () => {
            const res = await assetApi.list({ page: 1, per_page: 100 }); // TODO: proper search/infinite scroll
            return res.data;
        },
    });

    // Fetch Maintenance Record if Edit
    const { data: maintenanceData, isLoading: maintenanceLoading } = useQuery({
        queryKey: ['maintenance', maintenanceId],
        queryFn: () => maintenanceApi.get(maintenanceId!),
        enabled: isEdit,
    });

    useEffect(() => {
        if (maintenanceData?.data) {
            const r = maintenanceData.data;
            form.setValues({
                asset_id: r.asset_id,
                maintenance_type_id: r.maintenance_type_id?.toString() || '',
                scheduled_date: r.scheduled_date ? new Date(r.scheduled_date) : new Date(),
                description: r.description || '',
                cost: r.cost,
                vendor_id: r.vendor_id || '',
                status: r.status,
                findings: r.findings || '',
                actions_taken: r.actions_taken || '',
                odometer_reading: r.odometer_reading,
            });
        }
    }, [maintenanceData]);

    const mutation = useMutation({
        mutationFn: (values: typeof form.values) => {
            const payload: any = { ...values };
            // Convert date to string
            if (payload.scheduled_date) payload.scheduled_date = payload.scheduled_date.toISOString().split('T')[0];
            if (payload.maintenance_type_id) payload.maintenance_type_id = parseInt(payload.maintenance_type_id);

            if (isEdit) {
                return maintenanceApi.update(maintenanceId!, payload as UpdateMaintenanceRequest);
            } else {
                return maintenanceApi.create(payload as CreateMaintenanceRequest);
            }
        },
        onSuccess: () => {
            notifications.show({
                title: 'Success',
                message: `Work Order ${isEdit ? 'updated' : 'created'} successfully`,
                color: 'green',
            });
            queryClient.invalidateQueries({ queryKey: ['maintenance'] });
            onSuccess();
        },
        onError: (error: any) => {
            notifications.show({
                title: 'Error',
                message: error.message || 'Failed to save Work Order',
                color: 'red',
            });
        },
    });

    const assetOptions = assetsData?.map(a => ({ value: a.id, label: a.name })) || [];

    // Check if selected asset is a Vehicle to show Odometer field
    // TODO: Verify if category_id maps to Vehicles correctly. Assuming 'Vehicles' has checked ID or logic.
    // For now, always show Odometer if completed to allow update regardless of type if needed, or check category name if available.
    // Since we don't have category object populated in select list (only list), we'd need to lookup.
    // const selectedAsset = assetsData?.find(a => a.id === form.values.asset_id);
    // const isVehicle = selectedAsset?.category?.name === 'Vehicles'; 

    return (
        <Stack pos="relative">
            <LoadingOverlay visible={mutation.isPending || maintenanceLoading || assetsLoading} />

            <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
                <Stack>
                    <Select
                        label="Asset"
                        placeholder="Select asset"
                        data={assetOptions}
                        searchable
                        {...form.getInputProps('asset_id')}
                        disabled={isEdit}
                    />

                    <DateInput
                        label="Scheduled Date"
                        placeholder="Select date"
                        valueFormat="YYYY-MM-DD"
                        {...form.getInputProps('scheduled_date')}
                    />

                    {/* TODO: Maintenance Type Select */}

                    <Textarea
                        label="Description"
                        placeholder="Work to be done"
                        minRows={3}
                        {...form.getInputProps('description')}
                    />

                    <Select
                        label="Status"
                        data={[
                            { value: 'planned', label: 'Planned' },
                            { value: 'in_progress', label: 'In Progress' },
                            { value: 'completed', label: 'Completed' },
                            { value: 'cancelled', label: 'Cancelled' },
                        ]}
                        {...form.getInputProps('status')}
                    />

                    {/* Fields visible only when status is In Progress or Completed (or Edit mode generally) */}
                    {(isEdit || form.values.status !== 'planned') && (
                        <>
                            <Textarea
                                label="Findings"
                                placeholder="What was found?"
                                minRows={2}
                                {...form.getInputProps('findings')}
                            />
                            <Textarea
                                label="Actions Taken"
                                placeholder="What was done?"
                                minRows={2}
                                {...form.getInputProps('actions_taken')}
                            />
                            <NumberInput
                                label="Cost"
                                placeholder="0.00"
                                prefix="$"
                                decimalScale={2}
                                {...form.getInputProps('cost')}
                            />
                        </>
                    )}

                    {/* Odometer only if Completed */}
                    {form.values.status === 'completed' && (
                        <NumberInput
                            label="New Odometer Reading"
                            placeholder="Current reading"
                            description="Updates asset odometer"
                            {...form.getInputProps('odometer_reading')}
                        />
                    )}

                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={onClose}>Cancel</Button>
                        <Button type="submit" loading={mutation.isPending}>Save</Button>
                    </Group>
                </Stack>
            </form>
        </Stack>
    );
}
