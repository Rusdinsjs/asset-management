import { useState } from 'react';
import { TextInput, PasswordInput, Button, Paper, Title, Container } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';

export function Login() {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);

    const form = useForm({
        initialValues: {
            email: '',
            password: '',
        },
        validate: {
            email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
            password: (value) => (value.length < 6 ? 'Password must be at least 6 characters' : null),
        },
    });

    const handleSubmit = async (values: typeof form.values) => {
        setLoading(true);
        try {
            const response = await api.post('/auth/login', values);
            const { token, user } = response.data;
            login(token, user);

            notifications.show({
                title: 'Welcome back!',
                message: `Logged in as ${user.name}`,
                color: 'green',
            });

            navigate('/');
        } catch (error: any) {
            notifications.show({
                title: 'Login failed',
                message: error.response?.data?.error || 'Invalid credentials',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container size={420} my={40}>
            <Title ta="center">Asset Management</Title>

            <Paper withBorder shadow="md" p={30} mt={30} radius="md">
                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <TextInput
                        label="Email"
                        placeholder="you@example.com"
                        required
                        {...form.getInputProps('email')}
                    />
                    <PasswordInput
                        label="Password"
                        placeholder="Your password"
                        required
                        mt="md"
                        {...form.getInputProps('password')}
                    />
                    <Button fullWidth mt="xl" type="submit" loading={loading}>
                        Sign in
                    </Button>
                </form>
            </Paper>
        </Container>
    );
}
