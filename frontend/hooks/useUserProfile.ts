import AsyncStorage from "@react-native-async-storage/async-storage";

const PROFILE_KEY = "tripguard_user_profile";

export interface UserProfile {
  nationality: string;
  idp_type: string;       // "1968 Vienna Convention" | "1949 Geneva" | "ASEAN" | "Bilateral" | "None"
  visa_free_days: number;
  has_drone: boolean;
  drone_model: string;
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export async function loadUserProfile(): Promise<UserProfile | null> {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as Partial<UserProfile>;
  return {
    nationality: parsed.nationality || "",
    idp_type: parsed.idp_type || "None",
    visa_free_days: parsed.visa_free_days || 0,
    has_drone: !!parsed.has_drone,
    drone_model: parsed.drone_model || "None",
  };
}

export async function clearUserProfile(): Promise<void> {
  await AsyncStorage.removeItem(PROFILE_KEY);
}
