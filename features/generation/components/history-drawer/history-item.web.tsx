import { OverlayButton } from '@/components/self-ui/overlay-button';
import { Box } from '@/components/ui/box';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { showToast } from '@/utils/toast';
import { Check, Download, PlayCircle, Trash2 } from 'lucide-react-native';
import { MotiView } from 'moti';
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HistoryItemProps {
  url: string;
  index: number;
  isSelectionMode: boolean;
  isSelected: boolean;
  onPress: () => void;
  onDelete?: () => void;
}

export const HistoryItem = React.memo(
  function HistoryItem({ url, index, isSelectionMode, isSelected, onPress, onDelete }: HistoryItemProps) {
    const insets = useSafeAreaInsets();
    const isVideo = React.useMemo(() => {
      const ext = url.split('.').pop()?.toLowerCase();
      return ['mp4', 'mov', 'm4v', 'webm'].includes(ext || '');
    }, [url]);

    const handleSave = async () => {
      try {
        const response = await window.fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = url.split('/').pop() || 'download';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        showToast.success('Downloaded', 'Media downloaded.', insets.top + 8);
      } catch (error) {
        console.error('Error saving:', error);
        showToast.error('Error', 'Failed to download media.', insets.top + 8);
      }
    };

    return (
      <Pressable onPress={onPress} className="relative mb-4">
        <Box className="aspect-square overflow-hidden rounded-md border-outline-50 justify-center items-center bg-background-100">
          {isVideo ? (
            <>
              <video src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
              <View className="absolute inset-0 items-center justify-center bg-black/20">
                <Icon as={PlayCircle} className="text-white opacity-90 h-12 w-12" />
              </View>
            </>
          ) : (
            <img src={url} alt={`Generated media ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
        </Box>
        {isSelectionMode ? (
          <MotiView
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: isSelected ? 1 : 0, scale: isSelected ? 1 : 0.8 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="absolute right-2 bottom-2 rounded-full bg-accent-500 p-1.5 shadow-sm"
          >
            <Icon as={Check} size="sm" className="text-white" />
          </MotiView>
        ) : (
          <View className="absolute right-2 top-2 flex-row gap-2">
            <OverlayButton icon={Download} onPress={handleSave} />
            {onDelete && <OverlayButton icon={Trash2} onPress={() => onDelete()} iconColor="#ef4444" />}
          </View>
        )}
      </Pressable>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.url === nextProps.url &&
      prevProps.isSelectionMode === nextProps.isSelectionMode &&
      prevProps.isSelected === nextProps.isSelected
    );
  },
);

export const getItemLayout = (_: any, index: number) => ({
  length: 300,
  offset: 300 * index,
  index,
});
