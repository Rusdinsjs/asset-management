import { useState, useEffect } from "react";
import {
    Title,
    Paper,
    TextInput,
    Button,
    Group,
    Stack,
    Avatar,
    FileButton,
    Text,
    LoadingOverlay,
    Tabs,
    PasswordInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconUpload, IconUser, IconLock } from "@tabler/icons-react";
import { profileApi } from "../api/profile";
import { useAuthStore } from "../store/useAuthStore";

export function Profile() {
    const user = useAuthStore((state) => state.user);
    const refreshUser = useAuthStore((state) => state.refreshUser);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    const profileForm = useForm({
        initialValues: {
            name: "",
            phone: "",
        },
        validate: {
            name: (value) => (value.length < 2 ? "Name too short" : null),
        },
    });

    const passwordForm = useForm({
        initialValues: {
            old_password: "",
            new_password: "",
            confirm_password: "",
        },
        validate: {
            new_password: (value) =>
                value.length < 6 ? "Password must be at least 6 characters" : null,
            confirm_password: (value, values) =>
                value !== values.new_password ? "Passwords do not match" : null,
        },
    });

    useEffect(() => {
        if (user) {
            profileForm.setValues({
                name: user.name,
                phone: user.phone || "",
            });
        }
    }, [user]);

    const handleUpdateProfile = async (values: typeof profileForm.values) => {
        setLoading(true);
        try {
            await profileApi.updateProfile(values);
            notifications.show({
                title: "Success",
                message: "Profile updated successfully",
                color: "green",
            });
            refreshUser();
        } catch (error: any) {
            notifications.show({
                title: "Error",
                message: error.response?.data?.error || "Failed to update profile",
                color: "red",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (values: typeof passwordForm.values) => {
        setLoading(true);
        try {
            await profileApi.changePassword({
                old_password: values.old_password,
                new_password: values.new_password,
            });
            notifications.show({
                title: "Success",
                message: "Password changed successfully",
                color: "green",
            });
            passwordForm.reset();
        } catch (error: any) {
            notifications.show({
                title: "Error",
                message: error.response?.data?.error || "Failed to change password",
                color: "red",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarUpload = async (file: File | null) => {
        if (!file) return;
        setUploading(true);
        try {
            await profileApi.uploadAvatar(file);
            notifications.show({
                title: "Success",
                message: "Avatar uploaded successfully",
                color: "green",
            });
            refreshUser();
        } catch (error: any) {
            notifications.show({
                title: "Error",
                message: error.response?.data?.error || "Failed to upload avatar",
                color: "red",
            });
        } finally {
            setUploading(false);
        }
    };

    // Construct full avatar URL
    const avatarUrl = user?.avatar_url
        ? user.avatar_url.startsWith("http")
            ? `${user.avatar_url}?t=${Date.now()}`
            : `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}${user.avatar_url}?t=${Date.now()}`
        : undefined;

    return (
        <Stack gap="lg">
            <Group justify="space-between">
                <Title order={2}>My Profile</Title>
            </Group>

            <Group align="start" grow preventGrowOverflow={false}>
                {/* Avatar Section */}
                <Paper withBorder p="md" radius="md" style={{ flex: '0 0 300px' }}>
                    <Stack align="center" gap="md">
                        <Avatar
                            src={avatarUrl}
                            size={120}
                            radius={120}
                            color="blue"
                        >
                            {user?.name?.charAt(0).toUpperCase()}
                        </Avatar>

                        <div style={{ textAlign: "center" }}>
                            <Text size="lg" fw={500}>
                                {user?.name}
                            </Text>
                            <Text c="dimmed" size="sm">
                                {user?.role}
                            </Text>
                        </div>

                        <FileButton onChange={handleAvatarUpload} accept="image/png,image/jpeg">
                            {(props) => (
                                <Button
                                    {...props}
                                    variant="light"
                                    leftSection={<IconUpload size={14} />}
                                    loading={uploading}
                                >
                                    Upload Avatar
                                </Button>
                            )}
                        </FileButton>
                    </Stack>
                </Paper>

                {/* Forms Section */}
                <Paper withBorder p="md" radius="md" style={{ flex: 1 }}>
                    <Tabs defaultValue="general">
                        <Tabs.List>
                            <Tabs.Tab value="general" leftSection={<IconUser size={14} />}>
                                General Information
                            </Tabs.Tab>
                            <Tabs.Tab value="security" leftSection={<IconLock size={14} />}>
                                Security
                            </Tabs.Tab>
                        </Tabs.List>

                        <Tabs.Panel value="general" pt="md">
                            <form onSubmit={profileForm.onSubmit(handleUpdateProfile)}>
                                <Stack gap="md">
                                    <LoadingOverlay visible={loading} overlayProps={{ radius: "sm", blur: 2 }} />
                                    <TextInput
                                        label="Email"
                                        value={user?.email}
                                        disabled
                                        description="Email cannot be changed"
                                    />
                                    <TextInput
                                        label="Full Name"
                                        placeholder="Your name"
                                        {...profileForm.getInputProps("name")}
                                    />
                                    <TextInput
                                        label="Phone Number"
                                        placeholder="+62..."
                                        {...profileForm.getInputProps("phone")}
                                    />
                                    <Group justify="flex-end" mt="md">
                                        <Button type="submit" loading={loading}>
                                            Save Changes
                                        </Button>
                                    </Group>
                                </Stack>
                            </form>
                        </Tabs.Panel>

                        <Tabs.Panel value="security" pt="md">
                            <form onSubmit={passwordForm.onSubmit(handleChangePassword)}>
                                <Stack gap="md">
                                    <LoadingOverlay visible={loading} overlayProps={{ radius: "sm", blur: 2 }} />
                                    <PasswordInput
                                        label="Current Password"
                                        placeholder="Verify your current password"
                                        required
                                        {...passwordForm.getInputProps("old_password")}
                                    />
                                    <PasswordInput
                                        label="New Password"
                                        placeholder="Minimum 6 characters"
                                        required
                                        {...passwordForm.getInputProps("new_password")}
                                    />
                                    <PasswordInput
                                        label="Confirm New Password"
                                        placeholder="Repeat new password"
                                        required
                                        {...passwordForm.getInputProps("confirm_password")}
                                    />
                                    <Group justify="flex-end" mt="md">
                                        <Button type="submit" loading={loading} color="red" variant="light">
                                            Change Password
                                        </Button>
                                    </Group>
                                </Stack>
                            </form>
                        </Tabs.Panel>
                    </Tabs>
                </Paper>
            </Group>
        </Stack>
    );
}
