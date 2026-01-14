import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { departmentApi, type Department, type CreateDepartmentRequest } from '../api/departments';
import { Button, Input, Modal, useToast, ActionIcon, Card, Textarea } from '../components/ui';

export function Departments() {
    const queryClient = useQueryClient();
    const { success, error: showError } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDept, setEditingDept] = useState<Department | null>(null);

    // Form State
    const [formData, setFormData] = useState<CreateDepartmentRequest>({
        code: '',
        name: '',
        description: '',
    });

    const { data: departments, isLoading } = useQuery({
        queryKey: ['departments'],
        queryFn: departmentApi.list,
    });

    const filteredDepartments = departments?.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.code.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const createMutation = useMutation({
        mutationFn: departmentApi.create,
        onSuccess: () => {
            success('Department created successfully');
            queryClient.invalidateQueries({ queryKey: ['departments'] });
            handleClose();
        },
        onError: (err: any) => showError(err.response?.data?.error || 'Failed to create'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: CreateDepartmentRequest }) =>
            departmentApi.update(id, data),
        onSuccess: () => {
            success('Department updated successfully');
            queryClient.invalidateQueries({ queryKey: ['departments'] });
            handleClose();
        },
        onError: (err: any) => showError(err.response?.data?.error || 'Failed to update'),
    });

    const deleteMutation = useMutation({
        mutationFn: departmentApi.delete,
        onSuccess: () => {
            success('Department deleted');
            queryClient.invalidateQueries({ queryKey: ['departments'] });
        },
    });

    const handleEdit = (dept: Department) => {
        setEditingDept(dept);
        setFormData({
            code: dept.code,
            name: dept.name,
            description: dept.description || '',
            parent_id: dept.parent_id,
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this department?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleClose = () => {
        setIsModalOpen(false);
        setEditingDept(null);
        setFormData({ code: '', name: '', description: '' });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingDept) {
            updateMutation.mutate({ id: editingDept.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Departments</h1>
                    <p className="text-slate-400">Manage organizational departments</p>
                </div>
                <Button leftIcon={<Plus size={18} />} onClick={() => setIsModalOpen(true)}>
                    Add Department
                </Button>
            </div>

            <Card className="p-4">
                <div className="flex gap-4 mb-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <Input
                            className="pl-10"
                            placeholder="Search departments..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-700 text-slate-400 text-sm">
                                <th className="p-3">Code</th>
                                <th className="p-3">Name</th>
                                <th className="p-3">Description</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {isLoading ? (
                                <tr><td colSpan={4} className="p-4 text-center text-slate-500">Loading...</td></tr>
                            ) : filteredDepartments.length === 0 ? (
                                <tr><td colSpan={4} className="p-4 text-center text-slate-500">No departments found</td></tr>
                            ) : (
                                filteredDepartments.map(dept => (
                                    <tr key={dept.id} className="hover:bg-slate-900/50 group transition-colors">
                                        <td className="p-3 font-mono text-cyan-400">{dept.code}</td>
                                        <td className="p-3 font-medium text-white">{dept.name}</td>
                                        <td className="p-3 text-slate-400">{dept.description}</td>
                                        <td className="p-3 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ActionIcon onClick={() => handleEdit(dept)} title="Edit">
                                                    <Edit2 size={16} />
                                                </ActionIcon>
                                                <ActionIcon variant="danger" onClick={() => handleDelete(dept.id)} title="Delete">
                                                    <Trash2 size={16} />
                                                </ActionIcon>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal
                isOpen={isModalOpen}
                onClose={handleClose}
                title={editingDept ? 'Edit Department' : 'New Department'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Code"
                        placeholder="e.g. FIN-01"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        required
                    />
                    <Input
                        label="Name"
                        placeholder="e.g. Finance"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                    <Textarea
                        label="Description"
                        placeholder="Optional details..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
                        <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
                            {editingDept ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
