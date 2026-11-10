import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StatusBar,
  ScrollView,
  Modal,
  Dimensions,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// YOUR REAL FIREBASE PROJECT ID
const FIREBASE_PROJECT_ID = "connectx-app-beaeb";
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/messages`;

// Themes
const DARK_THEME = {
  bg: '#0B0E14',
  card: '#151922',
  text: '#FFFFFF',
  textSub: '#8E95A5',
  primary: '#0A84FF',
  selfBubble: '#0A84FF',
  otherBubble: '#1F2430',
  border: '#232936',
  danger: '#FF453A',
  success: '#30D158'
};

const LIGHT_THEME = {
  bg: '#F4F6FA',
  card: '#FFFFFF',
  text: '#111827',
  textSub: '#6B7280',
  primary: '#007AFF',
  selfBubble: '#007AFF',
  otherBubble: '#E5E7EB',
  border: '#E5E7EB',
  danger: '#DC2626',
  success: '#10B981'
};

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const colors = isDark ? DARK_THEME : LIGHT_THEME;

  const [activeTab, setActiveTab] = useState('CHATS');
  const [currentScreen, setCurrentScreen] = useState('MAIN');

  // Unique ID for this device
  const myUserId = useRef('user_' + Math.floor(1000 + Math.random() * 9000)).current;

  // User Profile
  const [userProfile, setUserProfile] = useState({
    name: 'Qasim (CONNECTX)',
    bio: 'Connected to live Firebase Cloud 🚀',
    phone: '+91 98765 43210',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'
  });

  const [blockedUsers, setBlockedUsers] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [callType, setCallType] = useState('video');
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [cameraFacing, setCameraFacing] = useState('front');

  // Modals
  const [chatMenuVisible, setChatMenuVisible] = useState(false);
  const [chatDeleteModalTarget, setChatDeleteModalTarget] = useState(null);
  const [addStatusModalVisible, setAddStatusModalVisible] = useState(false);
  const [editProfileModalVisible, setEditProfileModalVisible] = useState(false);
  const [addFriendModalVisible, setAddFriendModalVisible] = useState(false);

  // Status Viewing
  const [activeStoryGroup, setActiveStoryGroup] = useState(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

  // Inputs
  const [editName, setEditName] = useState(userProfile.name);
  const [editBio, setEditBio] = useState(userProfile.bio);
  const [editAvatar, setEditAvatar] = useState(userProfile.avatar);
  const [newFriendName, setNewFriendName] = useState('');
  const [newFriendPhone, setNewFriendPhone] = useState('');
  const [statusCaption, setStatusCaption] = useState('');
  const [selectedStatusPhoto, setSelectedStatusPhoto] = useState('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800');

  // Gallery Function
  const openDeviceGallery = (onImageSelected) => {
    try {
      if (typeof document !== 'undefined') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const file = e.target && e.target.files && e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (uploadEvent) => {
              if (uploadEvent.target && uploadEvent.target.result) {
                onImageSelected(uploadEvent.target.result);
              }
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      }
    } catch (err) {
      console.log('Gallery open error:', err);
    }
  };

  // Statuses
  const [myStatuses, setMyStatuses] = useState([
    {
      id: 'my_1',
      media: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
      caption: 'Live on Google Firebase Cloud 🌐',
      timeFormatted: 'Today, 9:25 AM',
      remainingHours: '24h remaining',
      viewers: []
    }
  ]);

  const [friendsStories] = useState([
    {
      user: {
        id: 'c1',
        name: 'Sarah Connor',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'
      },
      stories: [
        {
          id: 's1_1',
          media: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800',
          caption: 'Ready for live testing 🚀',
          timeFormatted: '10m ago',
          remainingHours: '23h remaining'
        }
      ]
    }
  ]);

  // Chats
  const [chats, setChats] = useState([
    {
      id: 'c1',
      name: 'Sarah Connor',
      phone: '+1 202 555 0143',
      type: 'direct',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      lastMsg: 'Waiting for your message...',
      time: 'Just now',
      unread: 0,
      online: true
    }
  ]);

  // Messages
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');

  // Fetch Live Cloud Messages from Firebase
  const fetchCloudMessages = async () => {
    try {
      const response = await fetch(FIRESTORE_URL);
      if (!response.ok) return;

      const data = await response.json();
      if (data && data.documents) {
        const parsedList = data.documents.map((doc) => {
          const f = doc.fields || {};
          return {
            id: doc.name.split('/').pop(),
            text: f.text ? f.text.stringValue : '',
            senderId: f.senderId ? f.senderId.stringValue : '',
            senderName: f.senderName ? f.senderName.stringValue : 'User',
            time: f.time ? f.time.stringValue : '',
            timestamp: f.timestamp ? Number(f.timestamp.integerValue || 0) : 0
          };
        });

        parsedList.sort((a, b) => a.timestamp - b.timestamp);
        setMessages(parsedList);
      }
    } catch (err) {
      // offline
    }
  };

  useEffect(() => {
    fetchCloudMessages();
    const interval = setInterval(fetchCloudMessages, 2500);
    return () => clearInterval(interval);
  }, []);

  // Send Message to Firebase Cloud
  const sendMessageToCloud = async () => {
    if (!inputText.trim()) return;

    const now = new Date();
    const hrs = now.getHours();
    const mins = now.getMinutes();
    const ampm = hrs >= 12 ? 'PM' : 'AM';
    const displayHrs = hrs % 12 ? hrs % 12 : 12;
    const displayMins = mins < 10 ? '0' + mins : mins;
    const timeFormatted = displayHrs + ':' + displayMins + ' ' + ampm;

    const textToSend = inputText.trim();
    setInputText('');

    const tempMsg = {
      id: String(Date.now()),
      text: textToSend,
      senderId: myUserId,
      senderName: userProfile.name,
      time: timeFormatted,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      await fetch(FIRESTORE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            text: { stringValue: textToSend },
            senderId: { stringValue: myUserId },
            senderName: { stringValue: userProfile.name },
            time: { stringValue: timeFormatted },
            timestamp: { integerValue: String(Date.now()) }
          }
        })
      });
      fetchCloudMessages();
    } catch (e) {
      console.log('Send error:', e);
    }
  };

  const isCurrentChatBlocked = selectedChat ? blockedUsers.includes(selectedChat.id) : false;

  const toggleBlockContact = (contactId) => {
    if (blockedUsers.includes(contactId)) {
      setBlockedUsers(prev => prev.filter(id => id !== contactId));
    } else {
      setBlockedUsers(prev => [...prev, contactId]);
    }
    setChatMenuVisible(false);
  };

  const deleteEntireChat = (chatId) => {
    setChats(prev => prev.filter(c => c.id !== chatId));
    setChatDeleteModalTarget(null);
    setChatMenuVisible(false);
    if (selectedChat?.id === chatId) {
      setCurrentScreen('MAIN');
      setSelectedChat(null);
    }
  };

  const postNewStatus = () => {
    if (!statusCaption.trim() && !selectedStatusPhoto) return;
    const newStatusEntry = {
      id: 'my_' + Date.now(),
      media: selectedStatusPhoto,
      caption: statusCaption.trim() || 'My Status',
      timeFormatted: 'Just now',
      remainingHours: '24h remaining',
      viewers: []
    };
    setMyStatuses(prev => [newStatusEntry, ...prev]);
    setStatusCaption('');
    setAddStatusModalVisible(false);
  };

  const saveProfile = () => {
    setUserProfile({
      ...userProfile,
      name: editName.trim() || userProfile.name,
      bio: editBio.trim() || userProfile.bio,
      avatar: editAvatar
    });
    setEditProfileModalVisible(false);
  };

  const addNewFriendByPhone = () => {
    if (!newFriendPhone.trim()) return;
    const friendName = newFriendName.trim() || `Friend (${newFriendPhone.slice(-4)})`;
    const newChatEntry = {
      id: 'friend_' + Date.now(),
      name: friendName,
      phone: newFriendPhone.trim(),
      type: 'direct',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      lastMsg: 'Tap to start conversation',
      time: 'Just now',
      unread: 0,
      online: true
    };
    setChats(prev => [newChatEntry, ...prev]);
    setSelectedChat(newChatEntry);
    setNewFriendName('');
    setNewFriendPhone('');
    setAddFriendModalVisible(false);
    setCurrentScreen('CHAT');
  };

  const currentViewingStory = activeStoryGroup
    ? activeStoryGroup.stories[currentStoryIndex]
    : null;

  // CALL SCREEN
  if (currentScreen === 'CALL') {
    return (
      <View style={[styles.callContainer, { backgroundColor: '#07090E' }]}>
        <StatusBar barStyle="light-content" />
        {callType === 'video' ? (
          <View style={styles.fullVideoMock}>
            <Image
              source={{ uri: selectedChat?.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600' }}
              style={styles.videoBackground}
              resizeMode="cover"
            />
            <View style={styles.pipView}>
              {!isCamOff ? (
                <View style={{ flex: 1, backgroundColor: '#1E232E', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name={cameraFacing === 'front' ? "person-circle" : "image-outline"} size={42} color="#0A84FF" />
                  <Text style={{ color: '#FFF', fontSize: 10, marginTop: 4, fontWeight: '700' }}>
                    {cameraFacing === 'front' ? 'Selfie Cam' : 'Rear Cam'}
                  </Text>
                  <Text style={{ color: '#8E95A5', fontSize: 8 }}>Live Cloud Feed</Text>
                </View>
              ) : (
                <View style={styles.camFallback}>
                  <Ionicons name="videocam-off" size={24} color="#FF453A" />
                  <Text style={{ color: '#FFF', fontSize: 9, marginTop: 4 }}>Cam Off</Text>
                </View>
              )}
            </View>
            <View style={styles.topCallBanner}>
              <Text style={styles.callNameText}>{selectedChat?.name || 'User'}</Text>
              <View style={styles.badgeRow}>
                <View style={[styles.statusPill, { backgroundColor: isSpeakerOn ? '#0A84FF' : '#374151' }]}>
                  <Ionicons name={isSpeakerOn ? "volume-high" : "volume-medium"} size={13} color="#FFF" />
                  <Text style={styles.pillText}>{isSpeakerOn ? 'Handsfree On' : 'Earpiece'}</Text>
                </View>
                <Text style={styles.callTimerText}>01:12 • Firebase</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.audioCenterContent}>
            <Image source={{ uri: selectedChat?.avatar }} style={styles.largeCallAvatar} />
            <Text style={styles.callNameText}>{selectedChat?.name || 'User'}</Text>
            <View style={[styles.statusPill, { backgroundColor: isSpeakerOn ? '#0A84FF' : '#374151', marginTop: 10 }]}>
              <Ionicons name={isSpeakerOn ? "volume-high" : "volume-medium"} size={14} color="#FFF" />
              <Text style={styles.pillText}>{isSpeakerOn ? 'Handsfree On' : 'Earpiece'}</Text>
            </View>
            <Text style={styles.callTimerText}>00:45 • CONNECTX Voice</Text>
          </View>
        )}

        <View style={styles.callControlsRow}>
          <TouchableOpacity style={[styles.callCircleBtn, isMuted && { backgroundColor: colors.danger }]} onPress={() => setIsMuted(!isMuted)}>
            <Ionicons name={isMuted ? "mic-off" : "mic"} size={22} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.callCircleBtn, isSpeakerOn && { backgroundColor: '#0A84FF' }]} onPress={() => setIsSpeakerOn(!isSpeakerOn)}>
            <Ionicons name={isSpeakerOn ? "volume-high" : "volume-medium"} size={22} color="#FFF" />
          </TouchableOpacity>
          {callType === 'video' && (
            <TouchableOpacity style={[styles.callCircleBtn, isCamOff && { backgroundColor: colors.danger }]} onPress={() => setIsCamOff(!isCamOff)}>
              <Ionicons name={isCamOff ? "videocam-off" : "videocam"} size={22} color="#FFF" />
            </TouchableOpacity>
          )}
          {callType === 'video' && !isCamOff && (
            <TouchableOpacity style={styles.callCircleBtn} onPress={() => setCameraFacing(prev => (prev === 'front' ? 'back' : 'front'))}>
              <Ionicons name="camera-reverse" size={22} color="#FFF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.callCircleBtn, { backgroundColor: '#FF3B30' }]} onPress={() => setCurrentScreen('CHAT')}>
            <Ionicons name="call" size={24} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // CHAT ROOM
  if (currentScreen === 'CHAT' && selectedChat) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

        <View style={[styles.chatHeaderBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setCurrentScreen('MAIN')} style={styles.touchArea}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Image source={{ uri: selectedChat.avatar }} style={styles.smallAvatar} />

          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {selectedChat.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.liveDot, { backgroundColor: '#34C759' }]} />
              <Text style={{ fontSize: 11, color: '#34C759', marginLeft: 4 }}>
                Firebase Cloud Live
              </Text>
            </View>
          </View>

          <TouchableOpacity onPress={() => { setCallType('audio'); setCurrentScreen('CALL'); }} style={[styles.headerActionBtn, { backgroundColor: colors.bg }]}>
            <Ionicons name="call" size={18} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { setCallType('video'); setCurrentScreen('CALL'); }} style={[styles.headerActionBtn, { backgroundColor: colors.primary, marginLeft: 6 }]}>
            <Ionicons name="videocam" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setChatMenuVisible(true)} style={[styles.headerActionBtn, { marginLeft: 4 }]}>
            <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 14 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Ionicons name="cloud-done-outline" size={36} color={colors.primary} />
              <Text style={{ color: colors.textSub, marginTop: 8, fontSize: 13 }}>
                Connected to Firebase. Send your first message!
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMe = item.senderId === myUserId;
            return (
              <View style={[styles.msgRow, isMe ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
                <View style={[styles.msgBubble, { backgroundColor: isMe ? colors.selfBubble : colors.otherBubble }]}>
                  {!isMe && (
                    <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700', marginBottom: 2 }}>
                      {item.senderName}
                    </Text>
                  )}
                  <Text style={[styles.msgText, { color: isMe ? '#FFFFFF' : colors.text }]}>
                    {item.text}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 }}>
                    <Text style={[styles.msgTime, { color: isMe ? '#E0E7FF' : colors.textSub }]}>
                      {item.time}
                    </Text>
                    {isMe && (
                      <Ionicons name="cloud-done" size={12} color="#E0E7FF" style={{ marginLeft: 4 }} />
                    )}
                  </View>
                </View>
              </View>
            );
          }}
        />

        {isCurrentChatBlocked ? (
          <TouchableOpacity onPress={() => toggleBlockContact(selectedChat.id)} style={[styles.blockedBanner, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <Text style={{ color: colors.danger, fontWeight: '700' }}>You blocked this contact. Tap to unblock.</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <TextInput
              style={[styles.inputBox, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
              placeholder="Send live cloud message..."
              placeholderTextColor={colors.textSub}
              value={inputText}
              onChangeText={setInputText}
            />
            <TouchableOpacity onPress={sendMessageToCloud} style={[styles.sendCircle, { backgroundColor: colors.primary }]}>
              <Ionicons name="send" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}

        <Modal visible={chatMenuVisible} transparent animationType="fade">
          <TouchableOpacity style={styles.menuOverlay} onPress={() => setChatMenuVisible(false)}>
            <View style={[styles.chatPopupMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity style={styles.menuItemRow} onPress={() => toggleBlockContact(selectedChat.id)}>
                <Ionicons name={isCurrentChatBlocked ? "shield-checkmark-outline" : "ban-outline"} size={18} color={colors.danger} />
                <Text style={[styles.menuItemText, { color: colors.danger }]}>{isCurrentChatBlocked ? 'Unblock' : 'Block'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItemRow} onPress={() => deleteEntireChat(selectedChat.id)}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
                <Text style={[styles.menuItemText, { color: colors.danger }]}>Delete Chat</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  }

  // MAIN DASHBOARD
  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={[styles.homeHeaderBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.brandText, { color: colors.text }]}>
          CONNECT<Text style={{ color: colors.primary }}>X</Text>
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[styles.cloudStatusBadge, { backgroundColor: '#34C759' }]}>
            <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '800' }}>CLOUD LIVE</Text>
          </View>
          <TouchableOpacity onPress={() => setAddFriendModalVisible(true)} style={{ marginLeft: 12 }}>
            <Ionicons name="person-add" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* CHATS TAB */}
      {activeTab === 'CHATS' && (
        <View style={{ flex: 1 }}>
          <View style={{ height: 105, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, alignItems: 'center' }}>
              <TouchableOpacity style={styles.storyCol} onPress={() => {
                setActiveStoryGroup({ isMine: true, user: userProfile, stories: myStatuses });
                setCurrentStoryIndex(0);
              }}>
                <View style={[styles.storyBorder, { borderColor: colors.primary }]}>
                  <Image source={{ uri: userProfile.avatar }} style={styles.storyImg} />
                  <TouchableOpacity onPress={() => setAddStatusModalVisible(true)} style={styles.addPlusBadge}>
                    <Ionicons name="add" size={14} color="#FFF" />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.storyName, { color: colors.textSub }]}>My Status</Text>
              </TouchableOpacity>

              {friendsStories.map(fg => (
                <TouchableOpacity key={fg.user.id} style={styles.storyCol} onPress={() => {
                  setActiveStoryGroup({ isMine: false, user: fg.user, stories: fg.stories });
                  setCurrentStoryIndex(0);
                }}>
                  <View style={[styles.storyBorder, { borderColor: colors.primary }]}>
                    <Image source={{ uri: fg.user.avatar }} style={styles.storyImg} />
                  </View>
                  <Text numberOfLines={1} style={[styles.storyName, { color: colors.textSub }]}>
                    {fg.user.name.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <FlatList
            data={chats}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.chatItem, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setSelectedChat(item);
                  setCurrentScreen('CHAT');
                }}
                onLongPress={() => setChatDeleteModalTarget(item)}
              >
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[styles.chatTitle, { color: colors.text }]}>{item.name}</Text>
                    <Text style={{ fontSize: 12, color: colors.textSub }}>{item.time}</Text>
                  </View>
                  <Text numberOfLines={1} style={{ fontSize: 13, color: colors.textSub, marginTop: 4 }}>
                    {messages.length > 0 ? messages[messages.length - 1].text : item.lastMsg}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />

          <TouchableOpacity
            style={[styles.fab, { backgroundColor: colors.primary }]}
            onPress={() => setAddFriendModalVisible(true)}
          >
            <Ionicons name="person-add" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* STATUS TAB */}
      {activeTab === 'STATUS' && (
        <ScrollView style={{ flex: 1, padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <TouchableOpacity onPress={() => {
              setActiveStoryGroup({ isMine: true, user: userProfile, stories: myStatuses });
              setCurrentStoryIndex(0);
            }}>
              <View style={[styles.storyBorder, { borderColor: colors.primary, width: 64, height: 64, borderRadius: 32 }]}>
                <Image source={{ uri: userProfile.avatar }} style={styles.storyImg} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={{ marginLeft: 14, flex: 1 }} onPress={() => {
              setActiveStoryGroup({ isMine: true, user: userProfile, stories: myStatuses });
              setCurrentStoryIndex(0);
            }}>
              <Text style={[styles.chatTitle, { color: colors.text }]}>My Status</Text>
              <Text style={{ fontSize: 12, color: colors.textSub }}>{myStatuses.length} updates • Tap to view</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setAddStatusModalVisible(true)} style={[styles.smallActionBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="camera" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* CALLS TAB */}
      {activeTab === 'CALLS' && (
        <FlatList
          data={chats}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={[styles.chatItem, { borderBottomColor: colors.border }]}>
              <Image source={{ uri: item.avatar }} style={styles.avatar} />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[styles.chatTitle, { color: colors.text }]}>{item.name}</Text>
                <Text style={{ fontSize: 12, color: colors.textSub, marginTop: 4 }}>{item.phone || '+91 98765 00000'}</Text>
              </View>
              <TouchableOpacity onPress={() => { setSelectedChat(item); setCallType('video'); setCurrentScreen('CALL'); }} style={{ padding: 6 }}>
                <Ionicons name="videocam" size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* PROFILE TAB */}
      {activeTab === 'PROFILE' && (
        <ScrollView style={{ flex: 1, padding: 20 }}>
          <View style={{ alignItems: 'center', marginVertical: 14 }}>
            <Image
              source={{ uri: userProfile.avatar }}
              style={{ width: 105, height: 105, borderRadius: 52, borderWidth: 3, borderColor: colors.primary }}
            />
            <Text style={[styles.callNameText, { color: colors.text, marginTop: 12 }]}>{userProfile.name}</Text>
            <Text style={{ color: colors.textSub, fontSize: 14, textAlign: 'center', marginTop: 4 }}>{userProfile.bio}</Text>
            <Text style={{ color: colors.primary, fontSize: 13, marginTop: 4, fontWeight: '600' }}>{userProfile.phone}</Text>

            <TouchableOpacity
              onPress={() => setEditProfileModalVisible(true)}
              style={[styles.editProfileBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="create-outline" size={16} color="#FFF" />
              <Text style={{ color: '#FFF', fontWeight: '700', marginLeft: 6 }}>Change Photo & Details</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* BOTTOM NAVIGATION TABS */}
      <View style={[styles.bottomNavBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity style={styles.navTab} onPress={() => setActiveTab('CHATS')}>
          <Ionicons name={activeTab === 'CHATS' ? "chatbubbles" : "chatbubbles-outline"} size={22} color={activeTab === 'CHATS' ? colors.primary : colors.textSub} />
          <Text style={[styles.navText, { color: activeTab === 'CHATS' ? colors.primary : colors.textSub }]}>Chats</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTab} onPress={() => setActiveTab('STATUS')}>
          <Ionicons name={activeTab === 'STATUS' ? "disc" : "disc-outline"} size={22} color={activeTab === 'STATUS' ? colors.primary : colors.textSub} />
          <Text style={[styles.navText, { color: activeTab === 'STATUS' ? colors.primary : colors.textSub }]}>Status</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTab} onPress={() => setActiveTab('CALLS')}>
          <Ionicons name={activeTab === 'CALLS' ? "call" : "call-outline"} size={22} color={activeTab === 'CALLS' ? colors.primary : colors.textSub} />
          <Text style={[styles.navText, { color: activeTab === 'CALLS' ? colors.primary : colors.textSub }]}>Calls</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTab} onPress={() => setActiveTab('PROFILE')}>
          <Ionicons name={activeTab === 'PROFILE' ? "person" : "person-outline"} size={22} color={activeTab === 'PROFILE' ? colors.primary : colors.textSub} />
          <Text style={[styles.navText, { color: activeTab === 'PROFILE' ? colors.primary : colors.textSub }]}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL: DELETE CHAT */}
      <Modal visible={!!chatDeleteModalTarget} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.confirmDeleteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="trash-bin" size={36} color={colors.danger} />
            <Text style={[styles.confirmDeleteTitle, { color: colors.text }]}>Delete this chat?</Text>
            <View style={styles.confirmBtnRow}>
              <TouchableOpacity onPress={() => setChatDeleteModalTarget(null)} style={[styles.dialogBtn, { backgroundColor: colors.bg }]}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteEntireChat(chatDeleteModalTarget?.id)} style={[styles.dialogBtn, { backgroundColor: colors.danger }]}>
                <Text style={{ color: '#FFF', fontWeight: '800' }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: ADD FRIEND */}
      <Modal visible={addFriendModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.statusModalCard, { backgroundColor: colors.card }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Add Friend by Phone</Text>
              <TouchableOpacity onPress={() => setAddFriendModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.editFieldInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border, marginTop: 10 }]}
              placeholder="Friend Name"
              placeholderTextColor={colors.textSub}
              value={newFriendName}
              onChangeText={setNewFriendName}
            />
            <TextInput
              style={[styles.editFieldInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
              placeholder="Phone Number (+91)"
              placeholderTextColor={colors.textSub}
              keyboardType="phone-pad"
              value={newFriendPhone}
              onChangeText={setNewFriendPhone}
            />
            <TouchableOpacity onPress={addNewFriendByPhone} style={[styles.postStatusBtn, { backgroundColor: colors.primary, marginTop: 10 }]}>
              <Text style={{ color: '#FFF', fontWeight: '800' }}>Add & Start Chatting</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: ADD STATUS */}
      <Modal visible={addStatusModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.statusModalCard, { backgroundColor: colors.card }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Add Status from Gallery</Text>
              <TouchableOpacity onPress={() => setAddStatusModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => openDeviceGallery((selectedImg) => setSelectedStatusPhoto(selectedImg))}
              style={[styles.galleryPickerBtn, { backgroundColor: colors.bg, borderColor: colors.primary }]}
            >
              <Ionicons name="images" size={32} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '700', marginTop: 6, fontSize: 14 }}>
                📂 Tap to Open Phone Gallery
              </Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.statusInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
              placeholder="Write a caption..."
              placeholderTextColor={colors.textSub}
              value={statusCaption}
              onChangeText={setStatusCaption}
            />
            <TouchableOpacity onPress={postNewStatus} style={[styles.postStatusBtn, { backgroundColor: colors.primary }]}>
              <Text style={{ color: '#FFF', fontWeight: '800' }}>Post Status</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: EDIT PROFILE */}
      <Modal visible={editProfileModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.statusModalCard, { backgroundColor: colors.card }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Change Profile</Text>
              <TouchableOpacity onPress={() => setEditProfileModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.editFieldInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border, marginTop: 10 }]}
              value={editName}
              onChangeText={setEditName}
            />
            <TouchableOpacity onPress={saveProfile} style={[styles.postStatusBtn, { backgroundColor: colors.primary, marginTop: 8 }]}>
              <Text style={{ color: '#FFF', fontWeight: '800' }}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: STORY VIEWER */}
      <Modal visible={!!activeStoryGroup} animationType="fade" transparent={false}>
        {activeStoryGroup && currentViewingStory && (
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <Image source={{ uri: currentViewingStory.media }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            <View style={styles.storyViewerHeader}>
              <Image source={{ uri: activeStoryGroup.user.avatar }} style={styles.smallAvatar} />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 15 }}>{activeStoryGroup.user.name}</Text>
                <Text style={{ color: '#E0E7FF', fontSize: 11 }}>{currentViewingStory.timeFormatted}</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveStoryGroup(null)}>
                <Ionicons name="close" size={28} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  homeHeaderBar: {
    paddingTop: 45,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 0.5
  },
  chatHeaderBar: {
    paddingTop: 45,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 0.5
  },
  brandText: { fontSize: 22, fontWeight: '900', letterSpacing: 1.2, flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  touchArea: { paddingRight: 10, paddingVertical: 4 },
  headerActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center'
  },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  cloudStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  storyCol: { alignItems: 'center', marginRight: 16 },
  storyBorder: { width: 58, height: 58, borderRadius: 29, borderWidth: 2.5, padding: 2 },
  storyImg: { width: '100%', height: '100%', borderRadius: 26 },
  storyName: { fontSize: 11, marginTop: 4, width: 68, textAlign: 'center' },
  addPlusBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0A84FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#0B0E14'
  },
  chatItem: { flexDirection: 'row', padding: 14, alignItems: 'center', borderBottomWidth: 0.5 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  smallAvatar: { width: 40, height: 40, borderRadius: 20 },
  chatTitle: { fontSize: 16, fontWeight: '700' },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8
  },
  msgRow: { flexDirection: 'row', marginVertical: 4 },
  msgBubble: { maxWidth: '80%', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 18 },
  msgText: { fontSize: 15, lineHeight: 20 },
  msgTime: { fontSize: 10, alignSelf: 'flex-end', marginTop: 4 },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    paddingBottom: 14,
    alignItems: 'center',
    borderTopWidth: 0.5
  },
  inputBox: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    paddingHorizontal: 16,
    marginHorizontal: 6,
    borderWidth: 1
  },
  sendCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  blockedBanner: {
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: 0.5
  },
  bottomNavBar: {
    height: 60,
    flexDirection: 'row',
    borderTopWidth: 0.5,
    justifyContent: 'space-around',
    alignItems: 'center'
  },
  navTab: { alignItems: 'center', justifyContent: 'center' },
  navText: { fontSize: 10, marginTop: 3, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  statusModalCard: { padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetTitle: { fontSize: 17, fontWeight: '800', marginBottom: 12 },
  statusInput: { height: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, marginTop: 10, marginBottom: 10, fontSize: 14 },
  galleryPickerBtn: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8
  },
  postStatusBtn: { height: 46, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  editFieldInput: { height: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, marginBottom: 10, fontSize: 14 },
  menuOverlay: { flex: 1, backgroundColor: 'transparent' },
  chatPopupMenu: {
    position: 'absolute',
    top: 55,
    right: 14,
    width: 160,
    borderRadius: 14,
    borderWidth: 1,
    elevation: 10,
    paddingVertical: 6
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#232936'
  },
  menuItemText: { fontSize: 14, fontWeight: '600', marginLeft: 10 },
  confirmDeleteCard: { width: '100%', borderRadius: 20, borderWidth: 1, padding: 22, alignItems: 'center' },
  confirmDeleteTitle: { fontSize: 18, fontWeight: '800', marginTop: 10 },
  confirmBtnRow: { flexDirection: 'row', marginTop: 20, width: '100%', justifyContent: 'space-between' },
  dialogBtn: { flex: 1, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginHorizontal: 6 },
  smallActionBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 14
  },
  callContainer: { flex: 1, justifyContent: 'center' },
  fullVideoMock: { flex: 1, width: '100%', height: '100%' },
  videoBackground: { width: '100%', height: '100%', opacity: 0.8 },
  topCallBanner: { position: 'absolute', top: 50, left: 20 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginRight: 8 },
  pillText: { color: '#FFF', fontSize: 11, fontWeight: '600', marginLeft: 4 },
  callTimerText: { color: '#D1D5DB', fontSize: 12 },
  pipView: { position: 'absolute', top: 50, right: 20, width: 105, height: 150, borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: '#374151', elevation: 8 },
  camFallback: { flex: 1, backgroundColor: '#1E232E', justifyContent: 'center', alignItems: 'center', padding: 6 },
  audioCenterContent: { alignItems: 'center' },
  largeCallAvatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 20 },
  callNameText: { color: '#FFF', fontSize: 24, fontWeight: '800' },
  callControlsRow: { position: 'absolute', bottom: 35, width: '100%', flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', paddingHorizontal: 8 },
  callCircleBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#232A38', justifyContent: 'center', alignItems: 'center' },
  btnLabel: { color: '#D1D5DB', fontSize: 9, marginTop: 2, fontWeight: '600' },
  storyViewerHeader: { position: 'absolute', top: 55, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, width: '100%', zIndex: 10 }
});
