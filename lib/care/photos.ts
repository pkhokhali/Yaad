import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';

async function pick(from: 'camera' | 'library'): Promise<string | null> {
  if (from === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]?.uri) return null;
    return result.assets[0].uri;
  }

  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    allowsEditing: true,
    aspect: [1, 1],
  });
  if (result.canceled || !result.assets[0]?.uri) return null;
  return result.assets[0].uri;
}

export async function takeReminderPhoto(): Promise<string | null> {
  return pick('camera');
}

export async function chooseReminderPhoto(): Promise<string | null> {
  return pick('library');
}

export async function persistReminderPhoto(
  sourceUri: string,
  reminderId: string,
): Promise<string> {
  const dir = `${FileSystem.documentDirectory ?? ''}yaad-photos/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const dest = `${dir}${reminderId}.jpg`;
  if (sourceUri !== dest) {
    await FileSystem.copyAsync({ from: sourceUri, to: dest });
  }
  return dest;
}
