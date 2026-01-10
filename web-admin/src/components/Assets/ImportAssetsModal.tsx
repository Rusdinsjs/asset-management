import { useState } from 'react';
import { Modal, Group, Button, FileButton, Table, Text, Stack, Badge, ScrollArea } from '@mantine/core';
import { IconUpload, IconFileSpreadsheet, IconX, IconCheck, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import Papa from 'papaparse';
import { api } from '../../api/client';

interface ImportAssetsModalProps {
    opened: boolean;
    onClose: () => void;
    onSuccess: () => void;
    categories: any[];
    locations: any[];
}

export function ImportAssetsModal({ opened, onClose, onSuccess, categories, locations }: ImportAssetsModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [parsing, setParsing] = useState(false);

    // Helpers to find IDs by name
    const findCategoryId = (name: string) => {
        // Search in flattened list (passed as props)
        const cat = categories.find((c: any) =>
            c.name.toLowerCase() === name.toLowerCase() ||
            c.code.toLowerCase() === name.toLowerCase()
        );
        return cat?.id;
    };

    const findLocationId = (name: string) => {
        const loc = locations.find((l: any) =>
            l.name.toLowerCase() === name.toLowerCase() ||
            l.code.toLowerCase() === name.toLowerCase()
        );
        return loc?.id;
    };

    const handleFileChange = (payload: File | null) => {
        setFile(payload);
        if (payload) {
            setParsing(true);
            Papa.parse(payload, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    // Process and validate rows
                    const processed = results.data.map((row: any) => {
                        const categoryId = findCategoryId(row.category || '');
                        const locationId = findLocationId(row.location || '');

                        return {
                            ...row,
                            _categoryId: categoryId,
                            _locationId: locationId,
                            _isValid: !!row.asset_code && !!row.name && !!categoryId
                        };
                    });
                    setPreviewData(processed);
                    setParsing(false);
                },
                error: (error) => {
                    console.error('CSV Parse Error:', error);
                    notifications.show({ title: 'Error', message: 'Failed to parse CSV', color: 'red' });
                    setParsing(false);
                }
            });
        } else {
            setPreviewData([]);
        }
    };

    const handleImport = async () => {
        const validRows = previewData.filter(r => r._isValid);
        if (validRows.length === 0) return;

        setLoading(true);
        try {
            // Map to API DTO
            const assets = validRows.map(row => ({
                asset_code: row.asset_code,
                name: row.name,
                category_id: row._categoryId,
                location_id: row._locationId || null,
                brand: row.brand || null,
                model: row.model || null,
                serial_number: row.serial_number || null,
                purchase_price: row.purchase_price ? parseFloat(row.purchase_price) : null,
                status: 'active', // Default
                is_rental: row.is_rental === 'true' || row.is_rental === '1'
            }));

            await api.post('/assets/bulk', { assets });

            notifications.show({
                title: 'Success',
                message: `Successfully imported ${assets.length} assets`,
                color: 'green'
            });
            onSuccess();
            handleClose();
        } catch (error: any) {
            notifications.show({
                title: 'Error',
                message: error.response?.data?.message || 'Import failed',
                color: 'red'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setPreviewData([]);
        onClose();
    };

    const downloadTemplate = () => {
        const headers = ['asset_code', 'name', 'category', 'location', 'brand', 'model', 'serial_number', 'purchase_price', 'is_rental'];
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "asset_import_template.csv");
        document.body.appendChild(link);
        link.click();
    };

    return (
        <Modal opened={opened} onClose={handleClose} title="Batch Import Assets" size="xl">
            <Stack>
                {!file ? (
                    <Group justify="center" p="xl" style={{ border: '2px dashed #eee', borderRadius: 8 }}>
                        <Stack align="center">
                            <FileButton onChange={handleFileChange} accept=".csv">
                                {(props) => (
                                    <Button {...props} leftSection={<IconUpload size={18} />}>
                                        Select CSV File
                                    </Button>
                                )}
                            </FileButton>
                            <Text size="xs" c="dimmed">Supported format: CSV (Comma separated)</Text>
                            <Button variant="subtle" size="xs" onClick={downloadTemplate} leftSection={<IconFileSpreadsheet size={16} />}>
                                Download Template
                            </Button>
                        </Stack>
                    </Group>
                ) : (
                    <Stack>
                        <Group justify="space-between">
                            <Text fw={500}>Preview: {previewData.length} rows</Text>
                            <Button color="red" variant="subtle" onClick={() => setFile(null)} leftSection={<IconTrash size={16} />}>
                                Clear
                            </Button>
                        </Group>

                        <ScrollArea h={300}>
                            <Table striped highlightOnHover withTableBorder>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>Status</Table.Th>
                                        <Table.Th>Code</Table.Th>
                                        <Table.Th>Name</Table.Th>
                                        <Table.Th>Category</Table.Th>
                                        <Table.Th>Location</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {previewData.map((row, idx) => (
                                        <Table.Tr key={idx}>
                                            <Table.Td>
                                                {row._isValid ?
                                                    <IconCheck size={18} color="green" /> :
                                                    <IconX size={18} color="red" />
                                                }
                                            </Table.Td>
                                            <Table.Td>{row.asset_code}</Table.Td>
                                            <Table.Td>{row.name}</Table.Td>
                                            <Table.Td>
                                                {row._categoryId ?
                                                    <Text size="sm">{row.category}</Text> :
                                                    <Badge color="red">Invalid: {row.category}</Badge>
                                                }
                                            </Table.Td>
                                            <Table.Td>
                                                {row.location ? (
                                                    row._locationId ?
                                                        <Text size="sm">{row.location}</Text> :
                                                        <Badge color="yellow">Unknown: {row.location}</Badge>
                                                ) : <Text c="dimmed">-</Text>}
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                        </ScrollArea>

                        <Group justify="flex-end">
                            <Button variant="default" onClick={handleClose}>Cancel</Button>
                            <Button
                                onClick={handleImport}
                                loading={loading}
                                disabled={previewData.filter(r => r._isValid).length === 0}
                            >
                                Import {previewData.filter(r => r._isValid).length} Assets
                            </Button>
                        </Group>
                    </Stack>
                )}
            </Stack>
        </Modal>
    );
}
