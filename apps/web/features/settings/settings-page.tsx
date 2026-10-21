"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { LoadingState } from "@/components/feedback/loading-state";
import { useTypingLanguage } from "@/components/language/language-provider";
import { PlayerAvatar } from "@/components/player/player-avatar";
import { AppButton } from "@/components/ui/app-button";
import { AppSelect } from "@/components/ui/app-select";
import { AppTextField } from "@/components/ui/app-text-field";
import { ApiError } from "@/lib/api/http";
import { LANGUAGES, isLanguageCode, type LanguageCode } from "@/lib/constants/languages";
import { changePassword, removeAvatar, updatePreferences, updateProfile, uploadAvatar } from "@/lib/api/users";

const AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export function SettingsPage() {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();
  const { setLanguage } = useTypingLanguage();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [language, setLanguageCode] = useState<LanguageCode>("rw");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [trackedUser, setTrackedUser] = useState(user);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (user !== trackedUser) {
    setTrackedUser(user);
    if (user) {
      setUsername(user.username);
      setDisplayName(user.display_name);
      const preferred = user.preferred_language?.code;
      if (preferred && isLanguageCode(preferred)) {
        setLanguageCode(preferred);
      }
    }
  }

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function clearAvatarPicker() {
    setAvatarFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function onPickAvatar(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    setAvatarError(null);
    setAvatarMessage(null);
    if (!next) {
      clearAvatarPicker();
      return;
    }
    if (!AVATAR_TYPES.has(next.type) || next.size > AVATAR_MAX_BYTES) {
      clearAvatarPicker();
      setAvatarError("Choose a JPEG, PNG, WebP, or GIF under 2 MB");
      return;
    }
    setAvatarFile(next);
    setPreviewUrl(URL.createObjectURL(next));
  }

  async function onUploadAvatar() {
    if (!avatarFile) {
      setAvatarError("Choose a JPEG, PNG, WebP, or GIF under 2 MB");
      return;
    }
    setAvatarError(null);
    setAvatarMessage(null);
    setSavingAvatar(true);
    try {
      await uploadAvatar(avatarFile);
      clearAvatarPicker();
      await refresh();
      setAvatarMessage("Picture updated");
    } catch (caught) {
      setAvatarError(caught instanceof ApiError ? caught.message : "Could not upload that picture");
    } finally {
      setSavingAvatar(false);
    }
  }

  async function onRemoveAvatar() {
    setAvatarError(null);
    setAvatarMessage(null);
    setSavingAvatar(true);
    try {
      await removeAvatar();
      clearAvatarPicker();
      await refresh();
      setAvatarMessage("Picture removed");
    } catch (caught) {
      setAvatarError(caught instanceof ApiError ? caught.message : "Could not remove that picture");
    } finally {
      setSavingAvatar(false);
    }
  }

  async function onSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileError(null);
    setProfileMessage(null);
    setSavingProfile(true);
    try {
      await updateProfile({
        username: username.trim(),
        display_name: displayName.trim(),
      });
      await updatePreferences(language);
      setLanguage(language);
      await refresh();
      setProfileMessage("Saved");
    } catch (caught) {
      setProfileError(caught instanceof ApiError ? caught.message : "Could not save your profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function onChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password updated");
    } catch (caught) {
      setPasswordError(caught instanceof ApiError ? caught.message : "Could not change your password");
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-10">
        <LoadingState label="Loading your settings" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-10 px-4 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted">{user.email}</p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium tracking-wide text-muted uppercase">Picture</h2>
        <div className="flex items-center gap-4">
          <PlayerAvatar
            avatarUrl={previewUrl ?? user.avatar_url ?? undefined}
            name={user.display_name || user.username}
            size="md"
          />
          <label className="text-sm">
            <span className="mb-1 block text-muted">Image</span>
            <input
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="block text-sm"
              type="file"
              onChange={onPickAvatar}
            />
          </label>
        </div>
        {avatarError ? (
          <p className="text-sm text-danger" role="alert">
            {avatarError}
          </p>
        ) : null}
        {avatarMessage ? <p className="text-sm text-link">{avatarMessage}</p> : null}
        <div className="flex gap-2">
          <AppButton isDisabled={!avatarFile || savingAvatar} type="button" onPress={() => void onUploadAvatar()}>
            {savingAvatar ? "Saving" : "Upload"}
          </AppButton>
          <AppButton
            isDisabled={!user.avatar_url || savingAvatar}
            type="button"
            variant="secondary"
            onPress={() => void onRemoveAvatar()}
          >
            Remove
          </AppButton>
        </div>
      </section>

      <form className="flex flex-col gap-4" onSubmit={(event) => void onSaveProfile(event)}>
        <h2 className="text-sm font-medium tracking-wide text-muted uppercase">Profile</h2>
        <AppTextField
          autoComplete="nickname"
          isRequired
          label="Display name"
          name="display_name"
          value={displayName}
          onChange={setDisplayName}
        />
        <AppTextField
          autoComplete="username"
          isRequired
          label="Username"
          name="username"
          value={username}
          onChange={setUsername}
        />
        <AppSelect
          label="Typing language"
          options={LANGUAGES.map((item) => ({ id: item.code, label: item.name }))}
          selectedKey={language}
          onSelectionChange={(key) => {
            if (isLanguageCode(key)) {
              setLanguageCode(key);
            }
          }}
        />
        {profileError ? (
          <p className="text-sm text-danger" role="alert">
            {profileError}
          </p>
        ) : null}
        {profileMessage ? <p className="text-sm text-link">{profileMessage}</p> : null}
        <AppButton className="self-start" isDisabled={savingProfile} type="submit">
          {savingProfile ? "Saving" : "Save profile"}
        </AppButton>
      </form>

      <form className="flex flex-col gap-4" onSubmit={(event) => void onChangePassword(event)}>
        <h2 className="text-sm font-medium tracking-wide text-muted uppercase">Password</h2>
        <AppTextField
          autoComplete="current-password"
          isRequired
          label="Current password"
          name="current_password"
          type="password"
          value={currentPassword}
          onChange={setCurrentPassword}
        />
        <AppTextField
          autoComplete="new-password"
          description="At least 6 characters, with uppercase, lowercase, and a number or symbol."
          isRequired
          label="New password"
          name="new_password"
          type="password"
          value={newPassword}
          onChange={setNewPassword}
        />
        <AppTextField
          autoComplete="new-password"
          isRequired
          label="Confirm new password"
          name="confirm_password"
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
        />
        {passwordError ? (
          <p className="text-sm text-danger" role="alert">
            {passwordError}
          </p>
        ) : null}
        {passwordMessage ? <p className="text-sm text-link">{passwordMessage}</p> : null}
        <AppButton className="self-start" isDisabled={savingPassword} type="submit" variant="secondary">
          {savingPassword ? "Updating" : "Update password"}
        </AppButton>
      </form>
    </div>
  );
}
