import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { CameraView } from '@/components/scanner/CameraView';
import { ScanConfirm } from '@/components/scanner/ScanConfirm';
import { scannerApi } from '@/lib/api';
import { useToken } from '@/hooks/useToken';
import type { LabelScanResult } from '@/types';

export default function ScanScreen() {
  const router = useRouter();
  const getToken = useToken();
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<LabelScanResult | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const scanMutation = useMutation({
    mutationFn: async (uri: string) => {
      const token = await getToken();
      return scannerApi.scanLabel(token, uri);
    },
    onSuccess: (result) => {
      setScanResult(result);
    },
  });

  const handleCapture = (uri: string) => {
    setCapturedUri(uri);
    setSheetVisible(true);
    scanMutation.mutate(uri);
  };

  const handleClose = () => {
    setSheetVisible(false);
    setCapturedUri(null);
    setScanResult(null);
    scanMutation.reset();
  };

  const handleAddToCellar = (result: LabelScanResult) => {
    handleClose();
    router.push({
      pathname: '/(tabs)/cellar/intake',
      params: {
        prefill_wine_name: result.wine_name ?? '',
        prefill_producer: result.producer ?? '',
        prefill_vintage: result.vintage?.toString() ?? '',
      },
    });
  };

  const handleLogNote = (result: LabelScanResult) => {
    handleClose();
    router.push({
      pathname: '/(tabs)/journal/new',
      params: {
        prefill_wine_name: result.wine_name ?? '',
        prefill_vintage: result.vintage?.toString() ?? '',
      },
    });
  };

  return (
    <View style={styles.root}>
      <CameraView onCapture={handleCapture} disabled={scanMutation.isPending || sheetVisible} />
      <ScanConfirm
        visible={sheetVisible}
        imageUri={capturedUri}
        result={scanResult}
        isScanning={scanMutation.isPending}
        onClose={handleClose}
        onAddToCellar={handleAddToCellar}
        onLogNote={handleLogNote}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
});
