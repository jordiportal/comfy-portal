import { Drawer, DrawerHeader } from '@/components/self-ui/drawer';
import { FlatList } from '@/components/ui/flat-list';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { loadHistoryMedia } from '@/services/image-storage';
import { showToast } from '@/utils/toast';
import { History } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeleteAlert } from './delete-alert';
import { BottomPanel, SelectButton } from './edit-controls';
import { HistoryItem, getItemLayout } from './history-item';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
  workflowId?: string;
  onSelectMedia?: (url: string) => void;
  onMediaDeleted?: () => void;
}

const ITEMS_PER_PAGE = 10;

export function HistoryDrawer({
  isOpen,
  onClose,
  serverId,
  workflowId,
  onSelectMedia,
  onMediaDeleted,
}: HistoryDrawerProps) {
  const insets = useSafeAreaInsets();
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [mediaItems, setMediaItems] = useState<{ url: string; timestamp: number }[]>([]);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | 'selection' | null>(null);

  const paginatedMedia = useMemo(() => mediaItems.slice(0, page * ITEMS_PER_PAGE), [mediaItems, page]);

  useEffect(() => {
    let mounted = true;
    if (isOpen && workflowId) {
      loadHistoryMedia(serverId, workflowId).then((newMedia) => {
        if (mounted) setMediaItems(newMedia);
      });
    }
    return () => { mounted = false; };
  }, [isOpen, serverId, workflowId]);

  useEffect(() => {
    if (!isOpen) {
      setIsSelectionMode(false);
      setSelectedMedia([]);
      setPage(1);
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleToggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => !prev);
    setSelectedMedia([]);
  }, []);

  const handleToggleSelect = useCallback((url: string) => {
    setSelectedMedia((prev) => (prev.includes(url) ? prev.filter((i) => i !== url) : [...prev, url]));
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedMedia((prev) => (prev.length === paginatedMedia.length ? [] : paginatedMedia.map((i) => i.url)));
  }, [paginatedMedia]);

  const confirmDelete = useCallback(async () => {
    if (!workflowId || !deleteTarget) return;
    try {
      if (deleteTarget === 'selection') {
        setSelectedMedia([]);
        setIsSelectionMode(false);
      }
      const updatedMedia = await loadHistoryMedia(serverId, workflowId);
      setMediaItems(updatedMedia);
      onMediaDeleted?.();
      setIsDeleteAlertOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error('Failed to delete media:', error);
      showToast.error('Delete Failed', 'Failed to delete media', insets.top + 8);
    }
  }, [deleteTarget, serverId, workflowId, onMediaDeleted, insets.top]);

  const handleDelete = useCallback(() => {
    if (selectedMedia.length > 0) {
      setDeleteTarget('selection');
      setIsDeleteAlertOpen(true);
    }
  }, [selectedMedia]);

  const handleSaveSelected = useCallback(async () => {
    if (selectedMedia.length === 0) return;
    for (const url of selectedMedia) {
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
      } catch { /* skip failed */ }
    }
    showToast.success('Downloaded', `Downloaded ${selectedMedia.length} items`, insets.top + 8);
    setIsSelectionMode(false);
    setSelectedMedia([]);
  }, [insets.top, selectedMedia]);

  const handleShareSelected = useCallback(async () => {
    if (selectedMedia.length === 0) return;
    if (navigator.share) {
      try {
        await navigator.share({ url: selectedMedia[0] });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(selectedMedia[0]);
      showToast.success('Copied', 'URL copied to clipboard', insets.top + 8);
    }
  }, [insets.top, selectedMedia]);

  const handleDeleteItem = useCallback((url: string) => {
    setDeleteTarget(url);
    setIsDeleteAlertOpen(true);
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: { url: string; timestamp: number }; index: number }) => (
      <HistoryItem
        url={item.url}
        index={index}
        isSelectionMode={isSelectionMode}
        isSelected={selectedMedia.includes(item.url)}
        onPress={() => (isSelectionMode ? handleToggleSelect(item.url) : onSelectMedia?.(item.url))}
        onDelete={() => handleDeleteItem(item.url)}
      />
    ),
    [isSelectionMode, selectedMedia, onSelectMedia, handleToggleSelect, handleDeleteItem],
  );

  const handleLoadMore = useCallback(() => {
    if (paginatedMedia.length >= mediaItems.length || isLoading) return;
    setIsLoading(true);
    setTimeout(() => { setPage((prev) => prev + 1); setIsLoading(false); }, 500);
  }, [paginatedMedia.length, mediaItems.length, isLoading]);

  const renderFooter = useMemo(() => {
    if (!isLoading) return null;
    return <View className="py-4"><Spinner size="small" /></View>;
  }, [isLoading]);

  const flatListProps = useMemo(
    () => ({
      data: paginatedMedia,
      renderItem,
      keyExtractor: (item: { url: string }) => item.url,
      getItemLayout,
      onEndReached: handleLoadMore,
      onEndReachedThreshold: 0.5,
      ListFooterComponent: renderFooter,
      contentContainerStyle: { paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 80 },
      initialNumToRender: 6,
    }),
    [paginatedMedia, renderItem, handleLoadMore, renderFooter],
  );

  return (
    <Drawer isOpen={isOpen} onClose={onClose} size="lg" anchor="right" insets={insets}>
      <View style={{ paddingTop: insets.top }} className="flex-1">
        <DrawerHeader className="border-b-[0.5px] border-b-background-100 px-4">
          <View className="flex-row items-center py-3">
            <View className="flex-1 flex-row items-center gap-2">
              <Icon as={History} size="sm" className="text-background-800" />
              <Text className="text-base font-medium text-background-800">History</Text>
            </View>
            <SelectButton isSelectionMode={isSelectionMode} onPress={handleToggleSelectionMode} />
          </View>
        </DrawerHeader>
        <FlatList {...flatListProps} />
        <BottomPanel
          isSelectionMode={isSelectionMode}
          selectedMedia={selectedMedia}
          mediaItems={mediaItems}
          onSelectAll={handleSelectAll}
          onDelete={handleDelete}
          onShare={handleShareSelected}
          onSave={handleSaveSelected}
        />
      </View>
      <DeleteAlert
        isOpen={isDeleteAlertOpen}
        onClose={() => setIsDeleteAlertOpen(false)}
        onConfirm={confirmDelete}
        title={deleteTarget === 'selection' ? 'Delete Selected Media' : 'Delete Media'}
        description={
          deleteTarget === 'selection'
            ? `Are you sure you want to delete ${selectedMedia.length} items? This action cannot be undone.`
            : 'Are you sure you want to delete this item? This action cannot be undone.'
        }
      />
    </Drawer>
  );
}
