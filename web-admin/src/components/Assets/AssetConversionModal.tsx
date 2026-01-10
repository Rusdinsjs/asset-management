import React, { useEffect, useState } from 'react';
import { Modal, TextInput, Select, NumberInput, Textarea, Button, Group, Radio, LoadingOverlay } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { categoryApi, type Category } from '../../api/category';
import { conversionApi } from '../../api/conversion';

interface AssetConversionModalProps {
    opened: boolean;
    onClose: () => void;
    assetId: string;
    onSuccess: () => void;
}

export const AssetConversionModal: React.FC<AssetConversionModalProps> = ({ opened, onClose, assetId, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);

    const form = useForm({
        initialValues: {
            title: '',
            to_category_id: '',
            conversion_cost: 0,
            cost_treatment: 'capitalize',
            reason: '',
            target_specifications: {}, // Dynamic specs? For now just empty or handled separately
        },
        validate: {
            title: (value) => (value.length < 3 ? 'Title must be at least 3 characters' : null),
            to_category_id: (value) => (!value ? 'Target category is required' : null),
            reason: (value) => (value.length < 10 ? 'Reason must be at least 10 characters' : null),
        },
    });

    useEffect(() => {
        if (opened) {
            fetchCategories();
        }
    }, [opened]);

    const fetchCategories = async () => {
        try {
            const data = await categoryApi.list();
            setCategories(data);
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'Failed to fetch categories',
                color: 'red',
            });
        }
    };

    const handleSubmit = async (values: typeof form.values) => {
        setLoading(true);
        try {
            await conversionApi.createRequest(assetId, {
                asset_id: assetId,
                title: values.title,
                to_category_id: values.to_category_id,
                conversion_cost: values.conversion_cost,
                cost_treatment: values.cost_treatment as 'capitalize' | 'expense',
                reason: values.reason,
                target_specifications: values.target_specifications,
            });
            notifications.show({
                title: 'Success',
                message: 'Conversion request submitted',
                color: 'green',
            });
            onSuccess();
            onClose();
            form.reset();
        } catch (error: any) {
            notifications.show({
                title: 'Error',
                message: error.response?.data?.error || 'Failed to submit request',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };



    return (
        <Modal opened={opened} onClose={onClose} title="Request Asset Conversion" size="lg">
            <LoadingOverlay visible={loading} />
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <TextInput
                    label="Request Title"
                    placeholder="e.g., Convert to IT Equipment"
                    required
                    mb="sm"
                    {...form.getInputProps('title')}
                />

                <Select
                    label="Target Category"
                    placeholder="Select category"
                    data={categories.map((c: Category) => ({
                        value: c.id,
                        label: c.name
                    }))}
                    searchable
                    mb="sm"
                    {...form.getInputProps('to_category_id')}
                />

                // ...
                <NumberInput
                    label="Conversion Cost"
                    placeholder="0.00"
                    min={0}
                    decimalScale={2}
                    fixedDecimalScale
                    mb="sm"
                    {...form.getInputProps('conversion_cost')}
                />

                <Radio.Group
                    label="Cost Treatment"
                    mb="sm"
                    {...form.getInputProps('cost_treatment')}
                >
                    <Group mt="xs">
                        <Radio value="capitalize" label="Capitalize (Add to Asset Value)" />
                        <Radio value="expense" label="Expense (Maintenance Cost)" />
                    </Group>
                </Radio.Group>

                <Textarea
                    label="Reason"
                    placeholder="Why is this conversion needed?"
                    minRows={3}
                    required
                    mb="md"
                    {...form.getInputProps('reason')}
                />

                <Group justify="flex-end">
                    <Button variant="default" onClick={onClose}>Cancel</Button>
                    <Button type="submit">Submit Request</Button>
                </Group>
            </form>
        </Modal>
    );
};
