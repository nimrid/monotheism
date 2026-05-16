import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts/ThemeContext';
import { useSolanaPayment } from '@/hooks/useSolanaPayment';
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { WebView } from 'react-native-webview';

const RECIPIENT_WALLET = 'GaJrqsUVQ5k5dmX8iacT9F4fHJrp9v11qXPzwWcAHkED';
// Cost per video in SKR (replace with your pricing decision)
const WATCH_VIDEO_COST_SKR = 5; // 5 SKR per video

// Identity used for Mobile Wallet Adapter authorization
const APP_IDENTITY = {
  name: 'Monotheism',
  uri: 'https://monotheism.app',
  icon: 'favicon.ico',
};

type Sermon = {
  id: string;
  title: string;
  channel: string;
  videoId: string;
  thumbnail: string;
};

const sermons: Sermon[] = [
  {
    id: '1',
    title: 'How to Read the Bible',
    channel: 'The Bible Project',
    videoId: 'ak06MSETeo4',
    thumbnail: 'https://img.youtube.com/vi/ak06MSETeo4/hqdefault.jpg',
  },
  {
    id: '2',
    title: 'The Story of the Bible',
    channel: 'The Bible Project',
    videoId: 'YjrxHqNy5CQ',
    thumbnail: 'https://img.youtube.com/vi/YjrxHqNy5CQ/hqdefault.jpg',
  },
  {
    id: '3',
    title: 'What is the Bible?',
    channel: 'The Bible Project',
    videoId: 'vFwNZNyDu9k',
    thumbnail: 'https://img.youtube.com/vi/vFwNZNyDu9k/hqdefault.jpg',
  },
  {
    id: '4',
    title: 'Literary Styles in the Bible',
    channel: 'The Bible Project',
    videoId: 'oUXJ8Owes8E',
    thumbnail: 'https://img.youtube.com/vi/oUXJ8Owes8E/hqdefault.jpg',
  },
  {
    id: '5',
    title: 'Word Study: Shalom - Peace',
    channel: 'The Bible Project',
    videoId: 'oLYORLZOaZE',
    thumbnail: 'https://img.youtube.com/vi/oLYORLZOaZE/hqdefault.jpg',
  },
  {
    id: '6',
    title: 'The Book of Genesis Overview',
    channel: 'The Bible Project',
    videoId: 'GQI72THyO5I',
    thumbnail: 'https://img.youtube.com/vi/GQI72THyO5I/hqdefault.jpg',
  },
  {
    id: '7',
    title: 'The Gospel of Matthew',
    channel: 'The Bible Project',
    videoId: '3Dv4-n6OYGI',
    thumbnail: 'https://img.youtube.com/vi/3Dv4-n6OYGI/hqdefault.jpg',
  },
  {
    id: '8',
    title: 'The Book of Psalms',
    channel: 'The Bible Project',
    videoId: 'j9phNEaPrv8',
    thumbnail: 'https://img.youtube.com/vi/j9phNEaPrv8/hqdefault.jpg',
  },
  {
    id: '9',
    title: 'Word Study: Agape - Love',
    channel: 'The Bible Project',
    videoId: 'slyevQ1LW7A',
    thumbnail: 'https://img.youtube.com/vi/slyevQ1LW7A/hqdefault.jpg',
  },
  {
    id: '10',
    title: 'The Book of Revelation',
    channel: 'The Bible Project',
    videoId: '5nvVVcYD-0w',
    thumbnail: 'https://img.youtube.com/vi/5nvVVcYD-0w/hqdefault.jpg',
  },
  {
    id: '11',
    title: 'Heaven and Earth',
    channel: 'The Bible Project',
    videoId: 'Zy2AQlK6C5k',
    thumbnail: 'https://img.youtube.com/vi/Zy2AQlK6C5k/hqdefault.jpg',
  },
  {
    id: '12',
    title: 'The Messiah',
    channel: 'The Bible Project',
    videoId: 'xmFPS0f-kzs',
    thumbnail: 'https://img.youtube.com/vi/xmFPS0f-kzs/hqdefault.jpg',
  },
];

const { width } = Dimensions.get('window');


export default function HermeneuticsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { paying, payWithSKR } = useSolanaPayment();
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [payingVideoId, setPayingVideoId] = useState<string | null>(null);

  const handlePayAndWatch = async (sermon: Sermon) => {
    setPayingVideoId(sermon.videoId);

    try {
      console.log('[Hermeneutics] Starting SKR payment for:', sermon.title);

      await payWithSKR(
        RECIPIENT_WALLET,
        WATCH_VIDEO_COST_SKR,
        async (transaction) => {
          return await transact(async (wallet: any) => {
            const authResult = await wallet.authorize({
              cluster: 'mainnet-beta',
              identity: APP_IDENTITY,
            });

            console.log('[Hermeneutics] Wallet authorized:', authResult.accounts[0]?.address);

            const results = await wallet.signAndSendTransactions({
              transactions: [transaction],
            });

            if (!results || results.length === 0) {
              throw new Error('No transaction result returned from wallet');
            }

            return results[0] as string;
          });
        }
      );

      console.log('[Hermeneutics] Payment confirmed, opening video:', sermon.title);
      openVideo(sermon.videoId);
    } catch (error: any) {
      console.error('[Hermeneutics] Payment failed:', error);
      const code = error?.code ?? '';
      if (code === 'WALLET_NOT_CONNECTED') return; // alert already shown by hook
      if (code === 'USER_REJECTED') {
        Alert.alert('Cancelled', 'Transaction was cancelled.');
        return;
      }
      if (code === 'INSUFFICIENT_BALANCE') {
        Alert.alert('Insufficient Balance', error.message);
        return;
      }
      Alert.alert(
        'Payment Failed',
        error.message ?? 'Unable to process payment. Please try again.'
      );
    } finally {
      setPayingVideoId(null);
    }
  };

  const openVideo = (videoId: string) => {
    setSelectedVideo(videoId);
  };

  const closeVideo = () => {
    setSelectedVideo(null);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Hermeneutics</Text>
          <View style={styles.placeholder} />
        </View>

      {/* Description */}
      <View style={[styles.descriptionCard, { backgroundColor: colors.card }]}>
        <View style={styles.descriptionHeader}>
          <View style={styles.descriptionLeft}>
            <Text style={[styles.descriptionTitle, { color: colors.text }]}>Study & Learn</Text>
            <Text style={[styles.descriptionText, { color: colors.secondaryText }]}>
              Watch educational videos about biblical interpretation, context, and understanding Scripture.
            </Text>
          </View>
        </View>
        <View style={[styles.pricingBadge, { backgroundColor: colors.background }]}>
          <IconSymbol name="play.circle.fill" size={16} color={colors.primary} />
          <Text style={[styles.pricingText, { color: colors.primary }]}>
            {WATCH_VIDEO_COST_SKR} SKR per video
          </Text>
        </View>
      </View>

      {/* Videos Grid */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.videosGrid}>
          {sermons.map((sermon) => (
            <TouchableOpacity
              key={sermon.id}
              style={[styles.videoCard, { backgroundColor: colors.card }]}
              onPress={() => handlePayAndWatch(sermon)}
              disabled={paying}
            >
              <View style={styles.thumbnailContainer}>
                <Image source={{ uri: sermon.thumbnail }} style={styles.thumbnail} />
                <View style={styles.playButton}>
                  {paying && payingVideoId === sermon.videoId ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <IconSymbol name="play.fill" size={24} color="#fff" />
                  )}
                </View>
                {/* Price Badge */}
                <View style={styles.priceBadge}>
                  <IconSymbol name="creditcard.fill" size={12} color="#fff" />
                  <Text style={styles.priceText}>{WATCH_VIDEO_COST_SKR} SKR</Text>
                </View>
              </View>
              <View style={styles.videoInfo}>
                <Text style={[styles.videoTitle, { color: colors.text }]} numberOfLines={2}>
                  {sermon.title}
                </Text>
                <Text style={[styles.videoChannel, { color: colors.tertiaryText }]}>{sermon.channel}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Video Player Modal */}
      <Modal
        visible={!!selectedVideo}
        animationType="slide"
        onRequestClose={closeVideo}
        presentationStyle="fullScreen"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeVideo} style={styles.closeButton}>
              <IconSymbol name="xmark.circle.fill" size={32} color="#fff" />
            </TouchableOpacity>
          </View>
          {selectedVideo && (
            <WebView
              style={styles.webview}
              source={{
                html: `
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                      <style>
                        * { margin: 0; padding: 0; }
                        body { background: #000; }
                        .video-container {
                          position: relative;
                          width: 100%;
                          height: 100vh;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                        }
                        iframe {
                          width: 100%;
                          height: 100%;
                          border: none;
                        }
                      </style>
                    </head>
                    <body>
                      <div class="video-container">
                        <iframe
                          src="https://www.youtube.com/embed/${selectedVideo}?autoplay=1&playsinline=1&rel=0&modestbranding=1&controls=1"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowfullscreen
                          frameborder="0"
                        ></iframe>
                      </div>
                    </body>
                  </html>
                `,
              }}
              allowsFullscreenVideo
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              domStorageEnabled
              scrollEnabled={false}
            />
          )}
        </View>
      </Modal>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  descriptionCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  descriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  descriptionLeft: {
    flex: 1,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  pricingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pricingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  videosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  videoCard: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  thumbnailContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -30 }, { translateY: -30 }],
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 149, 0, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  priceText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  videoInfo: {
    padding: 16,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  videoChannel: {
    fontSize: 13,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalHeader: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 22,
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
});
