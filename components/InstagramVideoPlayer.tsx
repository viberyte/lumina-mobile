import React from 'react';
import { Modal, View, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface InstagramVideoPlayerProps {
  visible: boolean;
  instagramUrl: string;
  onClose: () => void;
}

export default function InstagramVideoPlayer({ visible, instagramUrl, onClose }: InstagramVideoPlayerProps) {
  const insets = useSafeAreaInsets();

  // CSS to inject - hides Instagram UI, keeps only the media
  const injectedCSS = `
    /* Hide Instagram header */
    header { display: none !important; }
    
    /* Hide Instagram navigation */
    nav { display: none !important; }
    
    /* Hide login prompts */
    [role="dialog"] { display: none !important; }
    
    /* Hide "Open in app" banner */
    [class*="AppInstall"] { display: none !important; }
    
    /* Hide bottom bar */
    [class*="BottomBar"] { display: none !important; }
    
    /* Hide comments section */
    section[class*="Comments"] { display: none !important; }
    
    /* Center the media */
    body {
      background: #000 !important;
      overflow: hidden !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }
    
    /* Make video/image full screen */
    article, video, img {
      max-width: 100vw !important;
      max-height: 100vh !important;
      object-fit: contain !important;
    }
  `;

  const injectedJavaScript = `
    const style = document.createElement('style');
    style.innerHTML = \`${injectedCSS}\`;
    document.head.appendChild(style);
    true;
  `;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Close Button */}
        <TouchableOpacity
          style={[styles.closeButton, { top: insets.top + 8 }]}
          onPress={onClose}
        >
          <Ionicons name="close" size={30} color="#fff" />
        </TouchableOpacity>

        {/* WebView */}
        <WebView
          source={{ uri: instagramUrl }}
          style={styles.webview}
          injectedJavaScript={injectedJavaScript}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback={true}
          scrollEnabled={false}
          bounces={false}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    zIndex: 1000,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
});
