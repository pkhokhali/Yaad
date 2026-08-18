import { Platform } from 'react-native';

export type VoiceNetworkAccess = {
  allowNetwork: boolean;
  preferOffline: boolean;
  onCellular: boolean;
};

/**
 * Wi‑Fi (and ethernet/vpn) may use Google STT.
 * Mobile data is off unless the user enables it in Settings.
 */
export async function resolveVoiceNetworkAccess(
  allowMobileData: boolean,
): Promise<VoiceNetworkAccess> {
  if (Platform.OS === 'web') {
    return { allowNetwork: true, preferOffline: false, onCellular: false };
  }

  try {
    const Network = await import('expo-network');
    const state = await Network.getNetworkStateAsync();
    const type = state.type;
    const connected = Boolean(state.isConnected);
    const onCellular = type === Network.NetworkStateType.CELLULAR;
    const onWifiLike =
      type === Network.NetworkStateType.WIFI ||
      type === Network.NetworkStateType.ETHERNET ||
      type === Network.NetworkStateType.VPN ||
      type === Network.NetworkStateType.WIMAX;

    if (!connected || type === Network.NetworkStateType.NONE) {
      return { allowNetwork: false, preferOffline: true, onCellular: false };
    }

    if (onCellular) {
      return {
        allowNetwork: allowMobileData,
        preferOffline: !allowMobileData,
        onCellular: true,
      };
    }

    if (onWifiLike) {
      return { allowNetwork: true, preferOffline: false, onCellular: false };
    }

    return {
      allowNetwork: Boolean(state.isInternetReachable ?? connected),
      preferOffline: false,
      onCellular: false,
    };
  } catch {
    return {
      allowNetwork: allowMobileData,
      preferOffline: !allowMobileData,
      onCellular: false,
    };
  }
}
