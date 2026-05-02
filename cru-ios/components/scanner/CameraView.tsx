import { useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { CameraView as ExpoCamera, useCameraPermissions } from 'expo-camera';
import { colors } from '@/components/ui/tokens';

interface CameraViewProps {
  onCapture: (uri: string) => void;
  disabled?: boolean;
}

/**
 * Fullscreen camera viewfinder.
 * Garnet corner brackets as viewfinder guide (Halide-style).
 * Tap-to-capture button at bottom.
 * No header, no nested navigation — fullscreen experience.
 */
export function CameraView({ onCapture, disabled }: CameraViewProps) {
  const cameraRef = useRef<ExpoCamera>(null);
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission?.granted) {
    return (
      <View style={styles.permissionScreen}>
        <Text style={styles.permissionText}>Camera access is required to scan labels.</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const capture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (photo?.uri) onCapture(photo.uri);
    } catch {
      // camera hardware error or interrupted capture — silent no-op
    }
  };

  return (
    <View style={styles.root}>
      <ExpoCamera ref={cameraRef} style={styles.camera} facing="back">
        {/* Viewfinder bracket overlay */}
        <View style={styles.overlay}>
          {/* Instruction */}
          <Text style={styles.instruction}>Point at a wine label</Text>

          {/* Bracket guides */}
          <View style={styles.bracketContainer}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>

          {/* Capture button */}
          <TouchableOpacity style={styles.captureBtn} onPress={capture} activeOpacity={0.85} disabled={disabled}>
            <View style={styles.captureBtnInner} />
          </TouchableOpacity>
        </View>
      </ExpoCamera>
    </View>
  );
}

const BRACKET = 28;
const BRACKET_THICK = 3;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 80,
    paddingBottom: 60,
  },
  instruction: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 0.3,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  bracketContainer: {
    width: 220,
    height: 300,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: BRACKET,
    height: BRACKET,
    borderColor: colors.garnet,
  },
  topLeft: {
    top: 0, left: 0,
    borderTopWidth: BRACKET_THICK,
    borderLeftWidth: BRACKET_THICK,
  },
  topRight: {
    top: 0, right: 0,
    borderTopWidth: BRACKET_THICK,
    borderRightWidth: BRACKET_THICK,
  },
  bottomLeft: {
    bottom: 0, left: 0,
    borderBottomWidth: BRACKET_THICK,
    borderLeftWidth: BRACKET_THICK,
  },
  bottomRight: {
    bottom: 0, right: 0,
    borderBottomWidth: BRACKET_THICK,
    borderRightWidth: BRACKET_THICK,
  },
  captureBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.garnet,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.garnetShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  captureBtnInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    opacity: 0.15,
  },
  permissionScreen: {
    flex: 1,
    backgroundColor: '#0d0b09',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  permissionText: { color: 'rgba(255,255,255,0.6)', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  permissionBtn: {
    marginTop: 20,
    backgroundColor: colors.garnet,
    borderRadius: 22,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  permissionBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
